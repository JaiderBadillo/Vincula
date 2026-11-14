"""
Servicio Extractor de Pensums Académicos desde PDF
Utiliza `pypdf` para lectura nativa determinista ultrarrápida (costo $0 en tokens).
Soporta:
1. Mallas curriculares en matriz / columnas visuales (formato UTS, UIS, EAFIT, Politécnico).
2. Planes de estudio en lista secuencial estándar (formato UNAL, Javeriana, Andes).
Detecta semestres (I a XII), asignaturas, códigos, créditos (HTD HTI CR) y mapeo automático a taxonomía laboral.
"""

import io
import os
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
    "creditos", "propedeutico", "area de formacion", "pagina", "version",
    "requisito", "codigo nombre", "fecha", "consultar pensum", "academusoft", "metodologia", "jornada"
]

OCR_WIDTH = int(os.getenv("PENSUM_OCR_WIDTH", "2400"))  # px de ancho al rasterizar; menos = menos RAM
MAX_OCR_PAGES = 4  # OCR en CPU tarda varios segundos por página


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

        best = grid_result if grid_result.get("total_subjects", 0) > 0 else seq_result
        if best.get("total_semesters", 0) >= 2:
            return best

        # 3. Sin texto utilizable (escaneo / imagen / vectores) o semestres sin separar: OCR local
        ocr_result = cls._extract_with_ocr(pdf_bytes, program_name, total_pages)
        return ocr_result or best

    _ocr_engine = None

    @classmethod
    def _ocr_items(cls, pdf_bytes: bytes):
        """OCR 100 % local (RapidOCR/ONNX, modelo español). Devuelve, por página, [(texto, x0, y0, x1, y1)]."""
        import numpy as np
        import pypdfium2 as pdfium
        if cls._ocr_engine is None:
            from rapidocr import RapidOCR
            cls._ocr_engine = RapidOCR(params={"Rec.lang_type": "es", "Global.use_cls": False})
        doc = pdfium.PdfDocument(pdf_bytes)
        for i in range(min(len(doc), MAX_OCR_PAGES)):
            # ~2400 px de ancho: menos pierde los dígitos pequeños de las celdas; más es lento en CPU
            scale = min(4.0, max(1.0, OCR_WIDTH / doc[i].get_width()))
            res = cls._ocr_engine(np.array(doc[i].render(scale=scale).to_pil().convert("RGB")))
            if res.txts is None:
                yield []
                continue
            yield [(t.strip(), b[:, 0].min(), b[:, 1].min(), b[:, 0].max(), b[:, 1].max())
                   for t, b in zip(res.txts, res.boxes) if t.strip()]

    @classmethod
    def _extract_with_ocr(cls, pdf_bytes: bytes, program_name: str, pages: int) -> Optional[Dict[str, Any]]:
        """Mallas escaneadas/imagen: OCR local + agrupación por columnas de semestre. Nada sale del servidor."""
        try:
            ocr_pages = list(cls._ocr_items(pdf_bytes))
        except Exception:  # librerías ausentes, PDF corrupto o fallo del modelo
            return None

        sems: Dict[int, List[Dict[str, Any]]] = {}
        found_name = None
        for items in ocr_pages:
            head_re = re.compile(r"^(periodo|nivel|semestre|ciclo)\b")
            heads = [it for it in items if head_re.match(normalize_text(it[0]))]
            if len(heads) < 2:
                continue
            hy = sorted(h[2] for h in heads)[len(heads) // 2]
            heads = sorted((h for h in heads if abs(h[2] - hy) < 15), key=lambda h: h[1])
            if len(heads) < 2:
                continue
            sp = sorted(b[1] - a[1] for a, b in zip(heads, heads[1:]))[len(heads) // 2 - 1 if len(heads) > 2 else 0]
            hh = heads[0][4] - heads[0][2]
            lefts = [h[1] - 0.15 * sp for h in heads]

            def col_of(it, lefts=lefts, sp=sp):
                cx = (it[1] + it[3]) / 2
                for i, l in enumerate(lefts):
                    if l <= cx < l + sp:
                        return i
                return None

            # número de semestre: el del texto/ítem vecino del encabezado; si no, su posición
            nums = []
            for i, h in enumerate(heads):
                m = re.search(r"\d+", h[0]) or next(
                    (re.search(r"\d+", it[0]) for it in items
                     if re.fullmatch(r"\d{1,2}", it[0]) and abs(it[2] - hy) < 15 and col_of(it) == i), None)
                nums.append(int(m.group(0)) if m else i + 1)

            cut = min((it[2] for it in items if "acumulad" in normalize_text(it[0])), default=1e9)
            top = [it for it in items if it[2] < hy - 5]
            found_name = found_name or next(
                (re.sub(r"(?i)^plan de estudios\s*:?\s*", "", it[0]).strip() for it in top
                 if re.match(r"(?i)plan de estudios\s*:?\s*\S", it[0])),
                None) or next((it[0] for it in top if re.search(
                    r"ingenier|tecnolog|licenciatur|administraci|contadur|derecho|medicina|psicolog", normalize_text(it[0]))
                    and len(it[0]) > 8 and "universidad" not in normalize_text(it[0])), None)

            cols: Dict[int, List[tuple]] = {}
            for it in items:
                c = col_of(it)
                if c is not None and hy + hh * 0.5 < it[2] < cut - 5:
                    cols.setdefault(c, []).append(it)

            for c, col_items in cols.items():
                lines = []  # [cy, [ítems]]: une ítems de una misma fila ("4","8","4" -> "4 8 4")
                for it in sorted(col_items, key=lambda it: it[2] + it[4]):
                    cy = (it[2] + it[4]) / 2
                    if lines and abs(cy - lines[-1][0]) < 0.4 * (it[4] - it[2]):
                        lines[-1][1].append(it)
                    else:
                        lines.append([cy, [it]])
                gaps = sorted(b[0] - a[0] for a, b in zip(lines, lines[1:]))
                h_med = sorted(it[4] - it[2] for it in col_items)[len(col_items) // 2]
                big_gap = min(2.0 * gaps[len(gaps) // 2], 3.0 * h_med) if gaps else 1e9  # salto mayor = otra tarjeta

                names, code, prev_cy = [], None, None

                def flush(credits, n=nums[c]):
                    nonlocal names, code
                    name = re.sub(r"\s+", " ", " ".join(names)).strip(" .")
                    if len(name) >= 3 and sum(ch.isalpha() for ch in name) >= 3:
                        idx = len(sems.setdefault(n, [])) + 1
                        tax = match_subject_to_skills(name)
                        sems[n].append({
                            "id": f"sub-{n}-{idx}", "code": code or f"MAT-{n}{idx:02d}", "name": name,
                            "credits": credits if credits is not None else 3, "hours_weekly": None,
                            "family": tax["family_name"], "skills": tax["skills"],
                            "suggested_tools": tax["tools"], "equivalence_group": tax["equivalence_group"],
                        })
                    names, code = [], None

                for cy, row in lines:
                    if names and prev_cy is not None and cy - prev_cy > big_gap:
                        flush(None)  # tarjeta sin fila de créditos legible
                    prev_cy = cy
                    t = " ".join(x[0] for x in sorted(row, key=lambda x: x[1]))
                    if m := re.search(r"(\d+)\s*cr[eé]ditos?\b", t, re.I):
                        flush(int(m.group(1)))
                    elif re.fullmatch(r"\d+(?:\s+\d+)*", t):
                        toks = t.split()  # HT HP CRE; si el OCR perdió celdas, un solo número pequeño no es confiable
                        ok = len(toks) >= 2 or len(toks[0]) >= 3 or int(toks[0]) <= 4
                        flush(int(toks[-1][-1] if len(toks) == 1 and len(toks[0]) >= 3 else toks[-1]) if names and ok else None)
                    elif m := re.match(r"c[oó]d(?:igo)?\b\.?\s*:?\s*(.*)$", t, re.I):
                        d = re.search(r"\d{3,}", m.group(1))
                        code = d.group(0) if d else None
                    elif re.match(r"cr[eé]ditos\b|asignatura\b|ht\b|universidad\b|p[aá]gina\b|[aá]rea$", t, re.I):
                        continue  # totales y leyendas de la malla
                    else:
                        names.append(t)
                flush(None) if names and prev_cy is not None else None

        if not sems:
            return None
        generic = program_name in ("", "Programa Académico")
        result = cls._build_result(sems, found_name if (generic and found_name) else program_name, pages)
        result["source"] = "ocr"  # la UI debe pedir revisión antes de guardar
        return result

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
                                "hours_weekly": numbers[0] if len(numbers) >= 3 else None,
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
            return cls._build_result(grid_semesters, program_name, total_pages)

        return {"success": False, "total_semesters": 0, "total_subjects": 0}

    @classmethod
    def _build_result(cls, sems: Dict[int, List[Dict[str, Any]]], program_name: str, pages: int) -> Dict[str, Any]:
        """Arma el JSON final (esquema del frontend) y agrega alias `tools`, `semester_roman`."""
        formatted, skills, tools = [], [], []
        for n in sorted(k for k, v in sems.items() if v):
            roman = ROMAN_TOKENS[n - 1] if n <= len(ROMAN_TOKENS) else str(n)
            for sub in sems[n]:
                sub["tools"] = sub.get("suggested_tools", [])
                if not 1 <= (sub.get("credits") or 0) <= 12:  # lectura errónea (totales, celdas pegadas): mismo valor que cuando falta
                    sub["credits"] = 3
                skills.extend(sub.get("skills", []))
                tools.extend(sub["tools"])
            formatted.append({
                "semester_number": n,
                "semester_roman": roman,
                "semester_label": f"Semestre {roman}",
                "subjects_count": len(sems[n]),
                "subjects": sems[n],
            })
        return {
            "success": True,
            "program_name": program_name,
            "total_semesters": len(formatted),
            "total_subjects": sum(len(f["subjects"]) for f in formatted),
            "total_pages_analyzed": pages,
            "unique_skills_detected": list(dict.fromkeys(skills)),
            "unique_tools_detected": list(dict.fromkeys(tools)),
            "semesters": formatted,
        }

    @classmethod
    def _extract_sequential_layout(cls, reader: pypdf.PdfReader, program_name: str) -> Dict[str, Any]:
        """Lista secuencial: el encabezado de semestre manda; el código solo infiere si no hay encabezados."""
        lines = [l.strip() for page in reader.pages for l in (page.extract_text() or "").splitlines() if l.strip()]
        sems: Dict[int, List[Dict[str, Any]]] = {}
        current, seen_header, idx = 1, False, 1

        for line in lines:
            detected = cls._detect_semester(line)
            if detected is not None:
                current, seen_header = detected, True
                sems.setdefault(current, [])
                continue
            cand = cls._parse_subject_line(line, current, idx, require_code=not seen_header)
            if cand:
                sem = current if seen_header else (cand.pop("inferred_semester") or current)
                cand.pop("inferred_semester", None)
                sems.setdefault(sem, []).append(cand)
                idx += 1

        return cls._build_result(sems, program_name, len(reader.pages))

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
    def _parse_subject_line(line: str, semester: int, idx: int, require_code: bool = False) -> Optional[Dict[str, Any]]:
        """Parsea `CODIGO NOMBRE [HT HP HTP] CR [R - COD]`. Sin código no descarta la materia (salvo require_code)."""
        norm = normalize_text(line)
        if any(skip in norm for skip in SKIP_BOILERPLATE):
            return None

        text = re.sub(r'\s+[RCN]\s*-\s*[A-Z]{2,4}\d{2,4}[A-Z]?(?:\s*,.*)?$', '', line.strip())  # requisitos
        m = re.match(r'^([A-Z]{2,4}[-\s]?\d{2,4}[A-Z]?(?:-[A-Z]{2,4}\d{2,4})?|\d{1,2}\.)\s+(.+)$', text)
        inferred_sem = None
        if m:
            code, rest = m.group(1).strip(), m.group(2).strip()
            d = re.search(r'[A-Z]{2,4}[-\s]?([1-9])\d{2}', code)
            inferred_sem = int(d.group(1)) if d else None
        elif require_code or len(text.split()) < 2:
            return None
        else:
            code, rest = f"MAT-{semester}{idx:02d}", text

        # Columnas numéricas finales (HT HP HTP, créditos): "-" cuenta como vacío
        tail = re.search(r'((?:\s+(?:\d|-)){1,4})\s*$', rest)
        credits, hours = 3, None
        if tail:
            nums = [int(t) for t in tail.group(1).split() if t.isdigit()]
            if nums:
                credits = nums[-1]
                hours = sum(nums[:-1]) or None
            rest = rest[:tail.start()]
        name = re.sub(r'\s+', ' ', rest).strip(" .")

        if len(name) < 4 or sum(c.isalpha() for c in name) < 4:
            return None

        tax = match_subject_to_skills(name)
        return {
            "id": f"sub-{semester}-{idx}",
            "code": code,
            "name": name,
            "credits": credits,
            "hours_weekly": hours,
            "family": tax["family_name"],
            "skills": tax["skills"],
            "suggested_tools": tax["tools"],
            "equivalence_group": tax["equivalence_group"],
            "inferred_semester": inferred_sem,
        }
