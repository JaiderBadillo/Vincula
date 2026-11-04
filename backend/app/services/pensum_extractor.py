"""
Servicio Extractor de Pensums Académicos desde PDF
Utiliza `pypdf` para lectura nativa determinista ultrarrápida (costo $0 en tokens).
Soporta:
1. Mallas curriculares en matriz / columnas visuales (formato UTS, UIS, EAFIT, Politécnico).
2. Planes de estudio en lista secuencial estándar (formato UNAL, Javeriana, Andes).
Detecta semestres (I a XII), asignaturas, códigos, créditos (HTD HTI CR) y mapeo automático a taxonomía laboral.
"""

import io
import re
from typing import List, Dict, Any, Optional
import pypdf
from pypdf._page import _layout_mode
from pypdf.generic import ContentStream

from app.core.skills_taxonomy import match_subject_to_skills, normalize_text

CODE_REGEX = re.compile(r'^(?:[A-Z]{2,4}[-\s]?\d{3,4}|TSI005-TSI303|TSI\b|DCB\d+|DHI\d+|DDI\d+|DHT\d+|FCN\d+)$')
ROMAN_TOKENS = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"]
ROMAN_MAP = {
    'PRIMER': 1, 'SEGUNDO': 2, 'TERCER': 3, 'CUARTO': 4, 'QUINTO': 5,
    'SEXTO': 6, 'SEPTIMO': 7, 'SÉPTIMO': 7, 'OCTAVO': 8, 'NOVENO': 9, 'DECIMO': 10, 'DÉCIMO': 10,
    'I': 1, 'II': 2, 'III': 3, 'IV': 4, 'V': 5,
    'VI': 6, 'VII': 7, 'VIII': 8, 'IX': 9, 'X': 10, 'XI': 11, 'XII': 12
}

SEMESTER_PATTERNS = [
    re.compile(r'(?:SEMESTRE|NIVEL|CICLO|PERIODO|PERÍODO)\s*[:\-\.]?\s*([IVXLCDM]+|\d+)\b', re.IGNORECASE),
    re.compile(r'\b([IVXLCDM]+|\d+)\s*(?:°|º|er|do|to|ro|vo|\.)?\s*(?:SEMESTRE|NIVEL|CICLO|PERIODO)\b', re.IGNORECASE),
    re.compile(r'\b(PRIMER|SEGUNDO|TERCER|CUARTO|QUINTO|SEXTO|SÉPTIMO|SEPTIMO|OCTAVO|NOVENO|DÉCIMO|DECIMO)\s+(?:SEMESTRE|NIVEL|CICLO)\b', re.IGNORECASE),
    re.compile(r'^(?:SEM\.?|NIV\.?)\s*([IVXLCDM]+|\d+)\b', re.IGNORECASE),
]

SKIP_BOILERPLATE = [
    "unidades tecnologicas", "facultad de ciencias", "programa academico",
    "modalidad presencial", "lugar de desarrollo", "malla curricular", "docencia",
    "total tiempos", "nivel tecnologico", "ciclo tecnologico",
    "creditos", "propedeutico", "area de formacion", "pagina", "version"
]


class PensumPDFExtractor:
    """
    Extractor determinista para mallas curriculares y planes de estudio universitarios.
    """

    @classmethod
    def extract_from_bytes(cls, pdf_bytes: bytes, program_hint: str = "") -> Dict[str, Any]:
        """
        Punto de entrada principal para extraer asignaturas por semestre desde los bytes de un PDF.
        """
        reader = pypdf.PdfReader(io.BytesIO(pdf_bytes))
        total_pages = len(reader.pages)
        if total_pages == 0:
            return {"success": False, "error": "El archivo PDF no contiene páginas."}

        # Extraer nombre del programa de encabezados si no viene explícito
        program_name = program_hint or cls._detect_program_name(reader.pages[0])

        # 1. Intentar extracción por Matriz / Cuadrícula Visual (Layout multi-columna tipo UTS)
        grid_result = cls._extract_grid_layout(reader, program_name)
        if grid_result.get("success") and grid_result.get("total_semesters", 0) >= 3:
            return grid_result

        # 2. Si no es cuadrícula, procesar como Lista Secuencial Estándar
        seq_result = cls._extract_sequential_layout(reader, program_name)
        if seq_result.get("total_semesters", 0) > grid_result.get("total_semesters", 0):
            return seq_result

        return grid_result if grid_result.get("total_subjects", 0) > 0 else seq_result

    @classmethod
    def extract_from_file_path(cls, file_path: str, program_hint: str = "") -> Dict[str, Any]:
        with open(file_path, "rb") as f:
            return cls.extract_from_bytes(f.read(), program_hint)

    @classmethod
    def _detect_program_name(cls, page0) -> str:
        raw_text = page0.extract_text() or ""
        m = re.search(r'programa\s+acad[eé]mico\s+([^\n\r]+(?:\n[^\n\r]+)?)', raw_text, re.IGNORECASE)
        if m:
            captured = m.group(1).replace('\n', ' ').strip()
            captured = re.split(r'\b(?:modalidad|version|versi[oó]n|facultad|unidades|lugar)\b', captured, flags=re.IGNORECASE)[0].strip()
            if len(captured) > 5:
                return captured

        for line in raw_text.splitlines()[:25]:
            clean = line.strip()
            norm = normalize_text(clean)
            if any(k in norm for k in ["ingenieria", "tecnologia", "administracion", "contaduria"]):
                if len(clean) > 8:
                    return clean
        return "Programa Académico"

    @classmethod
    def _extract_grid_layout(cls, reader: pypdf.PdfReader, program_name: str) -> Dict[str, Any]:
        """
        Extrae asignaturas cuando el PDF está organizado en columnas espaciales (Matriz de semestres I a VI/X).
        """
        grid_semesters: Dict[int, List[Dict[str, Any]]] = {}
        total_pages = len(reader.pages)

        for page in reader.pages:
            try:
                fonts = page._layout_mode_fonts()
                contents_obj = page["/Contents"]
                if isinstance(contents_obj, pypdf.generic.ArrayObject):
                    ops_list = []
                    for sub_obj in contents_obj:
                        ops_list.extend(ContentStream(sub_obj.get_object(), page.pdf, "bytes").operations)
                    ops = iter(ops_list)
                else:
                    ops = iter(ContentStream(contents_obj.get_object(), page.pdf, "bytes").operations)

                bts = _layout_mode.text_show_operations(ops, fonts, True, None)

                # Encontrar la línea vertical (ty) de los encabezados de columnas (I, II, III...)
                header_y = None
                for item in bts:
                    matches = list(re.finditer(r'\b(I|II|III|IV|V|VI|VII|VIII|IX|X)\b', item["text"]))
                    if len(matches) >= 2:
                        header_y = item["ty"]
                        break

                if header_y is None:
                    continue

                # Recolectar centros X de todas las columnas en la banda del header
                col_centers = []
                for item in bts:
                    if abs(item["ty"] - header_y) <= 12:
                        t = item["text"]
                        matches = list(re.finditer(r'\b(I|II|III|IV|V|VI|VII|VIII|IX|X)\b', t))
                        if matches:
                            tx = item["tx"]
                            total_l = max(1, len(t))
                            disp = item.get("displaced_tx", tx)
                            cw = (disp - tx) / total_l if disp > tx else (item["font_size"] * 0.5)
                            for m in matches:
                                c_center = tx + ((m.start() + m.end()) / 2.0) * cw
                                col_num = ROMAN_MAP.get(m.group(0))
                                if col_num:
                                    col_centers.append((col_num, c_center))

                if not col_centers:
                    continue

                dedup_cols: Dict[int, float] = {}
                for num, x in col_centers:
                    if num not in dedup_cols:
                        dedup_cols[num] = x

                sorted_nums = sorted(dedup_cols.keys())
                num_to_x = dedup_cols

                # Asignar cada fragmento de texto a su columna correspondiente
                page_cols_data: Dict[int, List[Dict[str, Any]]] = {n: [] for n in sorted_nums}

                for item in bts:
                    text = item["text"]
                    tx = item["tx"]
                    ty = item["ty"]
                    total_l = max(1, len(text))
                    disp = item.get("displaced_tx", tx)
                    cw = (disp - tx) / total_l if disp > tx else (item["font_size"] * 0.5)

                    for m in re.finditer(r"\S+(?: \S+)*", text):
                        chunk = m.group(0).strip()
                        if not chunk:
                            continue
                        chunk_x = tx + ((m.start() + m.end()) / 2.0) * cw

                        closest_col = min(sorted_nums, key=lambda n: abs(num_to_x[n] - chunk_x))
                        if abs(num_to_x[closest_col] - chunk_x) <= 65:
                            page_cols_data[closest_col].append({"text": chunk, "y": ty, "x": chunk_x})

                # Agrupar fragmentos en cajas de asignaturas dentro de cada semestre
                for col_num in sorted_nums:
                    raw_items = sorted(page_cols_data[col_num], key=lambda it: it["y"])
                    filtered = []
                    for it in raw_items:
                        txt = it["text"]
                        norm = normalize_text(txt)
                        if it["y"] < 210:
                            continue
                        if it["y"] > 1005:
                            continue
                        if any(skip in norm for skip in SKIP_BOILERPLATE):
                            continue
                        if re.match(r'^\b(?:htd|hti|cr)\b$', norm):
                            continue
                        filtered.append(it)

                    boxes = []
                    curr_box = []
                    for it in filtered:
                        t = it["text"]
                        norm_t = normalize_text(t)
                        is_type = norm_t.startswith(("teor", "prac"))
                        is_code = bool(CODE_REGEX.match(t))
                        has_code = any(CODE_REGEX.match(tok["text"]) for tok in curr_box)
                        has_num = any(re.match(r'^\d+$', tok["text"]) for tok in curr_box)

                        if (is_code and has_code) or ((is_type or is_code) and has_num):
                            if curr_box:
                                boxes.append(curr_box)
                            curr_box = [it]
                        else:
                            curr_box.append(it)
                    if curr_box:
                        boxes.append(curr_box)

                    col_subjects = []
                    for b_idx, box in enumerate(boxes):
                        code = None
                        credits = 3
                        name_words = []
                        numbers = []

                        for it in box:
                            t = it["text"]
                            norm_t = normalize_text(t)
                            if CODE_REGEX.match(t) and not code:
                                code = t
                            elif t.isdigit():
                                numbers.append(int(t))
                            elif norm_t.startswith(("teor", "prac")):
                                continue
                            else:
                                name_words.append(t)

                        if len(numbers) >= 3:
                            credits = numbers[-1]
                        elif len(numbers) == 1 and 1 <= numbers[0] <= 8:
                            credits = numbers[0]

                        name = " ".join(name_words).strip()
                        name = re.sub(r'\s+', ' ', name)
                        if name.endswith('.'):
                            name = name[:-1]

                        if len(name) >= 3 and not name.isdigit():
                            tax = match_subject_to_skills(name)
                            col_subjects.append({
                                "id": f"sub-{col_num}-{len(col_subjects)+1}",
                                "code": code or f"MAT-{col_num}{len(col_subjects)+1:02d}",
                                "name": name,
                                "credits": credits,
                                "family": tax["family_name"],
                                "skills": tax["skills"],
                                "suggested_tools": tax["tools"],
                                "equivalence_group": tax["equivalence_group"]
                            })

                    if col_subjects:
                        if col_num not in grid_semesters:
                            grid_semesters[col_num] = []
                        grid_semesters[col_num].extend(col_subjects)

            except Exception:
                continue

        if len(grid_semesters) >= 3:
            formatted = []
            all_skills = []
            all_tools = []
            total_s = 0

            for s_num in sorted(grid_semesters.keys()):
                subs = grid_semesters[s_num]
                total_s += len(subs)
                for s in subs:
                    all_skills.extend(s.get("skills", []))
                    all_tools.extend(s.get("suggested_tools", []))
                formatted.append({
                    "semester_number": s_num,
                    "semester_label": f"Semestre {ROMAN_TOKENS[s_num-1] if s_num <= len(ROMAN_TOKENS) else s_num}",
                    "subjects_count": len(subs),
                    "subjects": subs
                })

            return {
                "success": True,
                "program_name": program_name,
                "total_semesters": len(formatted),
                "total_subjects": total_s,
                "total_pages_analyzed": total_pages,
                "unique_skills_detected": list(dict.fromkeys(all_skills)),
                "unique_tools_detected": list(dict.fromkeys(all_tools)),
                "semesters": formatted
            }

        return {"success": False, "total_semesters": 0, "total_subjects": 0}

    @classmethod
    def _extract_sequential_layout(cls, reader: pypdf.PdfReader, program_name: str) -> Dict[str, Any]:
        """
        Extrae asignaturas cuando el PDF es una lista secuencial tradicional.
        """
        full_text_lines = []
        for page in reader.pages:
            raw = page.extract_text() or ""
            for line in raw.splitlines():
                stripped = line.strip()
                if stripped:
                    full_text_lines.append(stripped)

        semesters_dict: Dict[int, List[Dict[str, Any]]] = {}
        current_semester = 1
        subject_counter = 1

        for line in full_text_lines:
            detected_sem = cls._detect_semester(line)
            if detected_sem is not None:
                current_semester = detected_sem
                if current_semester not in semesters_dict:
                    semesters_dict[current_semester] = []
                continue

            candidate = cls._parse_subject_line(line, current_semester, subject_counter)
            if candidate:
                effective_sem = candidate.get("inferred_semester") or current_semester
                if effective_sem not in semesters_dict:
                    semesters_dict[effective_sem] = []
                semesters_dict[effective_sem].append(candidate)
                subject_counter += 1

        formatted = []
        all_skills = []
        all_tools = []
        total_s = 0

        for sem_num in sorted(semesters_dict.keys()):
            subs = semesters_dict[sem_num]
            if not subs:
                continue
            total_s += len(subs)
            for s in subs:
                all_skills.extend(s.get("skills", []))
                all_tools.extend(s.get("suggested_tools", []))

            formatted.append({
                "semester_number": sem_num,
                "semester_label": f"Semestre {ROMAN_TOKENS[sem_num-1] if sem_num <= len(ROMAN_TOKENS) else sem_num}",
                "subjects_count": len(subs),
                "subjects": subs
            })

        return {
            "success": True,
            "program_name": program_name,
            "total_semesters": len(formatted),
            "total_subjects": total_s,
            "total_pages_analyzed": len(reader.pages),
            "unique_skills_detected": list(dict.fromkeys(all_skills)),
            "unique_tools_detected": list(dict.fromkeys(all_tools)),
            "semesters": formatted
        }

    @classmethod
    def _detect_semester(cls, line: str) -> Optional[int]:
        clean = line.strip()
        for pattern in SEMESTER_PATTERNS:
            match = pattern.search(clean)
            if match:
                raw_token = match.group(1).upper()
                if raw_token in ROMAN_MAP:
                    return ROMAN_MAP[raw_token]
                if raw_token.isdigit():
                    val = int(raw_token)
                    if 1 <= val <= 12:
                        return val
        return None

    @staticmethod
    def _parse_subject_line(line: str, semester: int, idx: int) -> Optional[Dict[str, Any]]:
        norm = normalize_text(line)
        if any(skip in norm for skip in SKIP_BOILERPLATE):
            return None

        code_match = re.match(r'^([A-Z]{2,4}[-\s]?\d{3,4}|\d{1,2}\.|\b[A-Z0-9]{4,8}\b)\s+(.+)$', line.strip())
        inferred_sem = None

        if code_match:
            code = code_match.group(1).strip()
            rest = code_match.group(2).strip()
            sem_digit_match = re.search(r'[A-Z]{2,4}[-\s]?([1-9])\d{2}', code)
            if sem_digit_match:
                inferred_sem = int(sem_digit_match.group(1))
        else:
            words = line.split()
            if len(words) < 2 or len(line) < 6:
                return None
            code = f"MAT-{semester}{idx:02d}"
            rest = line.strip()

        credits_val = 3
        credits_match = re.search(r'\s+(\d)\s*$', rest)
        if credits_match:
            credits_val = int(credits_match.group(1))
            name = rest[:credits_match.start()].strip()
        else:
            name = rest.strip()

        if len(name) < 4 or name.isdigit():
            return None

        tax = match_subject_to_skills(name)

        return {
            "id": f"sub-{semester}-{idx}",
            "code": code,
            "name": name,
            "credits": credits_val,
            "family": tax["family_name"],
            "skills": tax["skills"],
            "suggested_tools": tax["tools"],
            "equivalence_group": tax["equivalence_group"],
            "inferred_semester": inferred_sem,
        }
