import os
import pypdf
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT, TA_JUSTIFY
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

# Registrar fuentes Arial de Windows
pdfmetrics.registerFont(TTFont('Arial', r'C:\Windows\Fonts\arial.ttf'))
pdfmetrics.registerFont(TTFont('Arial-Bold', r'C:\Windows\Fonts\arialbd.ttf'))
pdfmetrics.registerFont(TTFont('Arial-Italic', r'C:\Windows\Fonts\ariali.ttf'))

output_dir = os.path.join('tda', 'Parciales')
os.makedirs(output_dir, exist_ok=True)
pdf_path = os.path.join(output_dir, 'TP-2026-2-2.pdf')

# A4: 595.28 x 841.89 pt
# Margen lateral: 38 pt -> Ancho útil: 519.28 pt
left_margin = 38
right_margin = 38
top_margin = 38
bottom_margin = 35
usable_width = 595.28 - (left_margin + right_margin)

doc = SimpleDocTemplate(
    pdf_path,
    pagesize=A4,
    leftMargin=left_margin,
    rightMargin=right_margin,
    topMargin=top_margin,
    bottomMargin=bottom_margin,
    title='Teoria de Algoritmos (TB024) - Parcial 2° Oportunidad (17 de noviembre de 2026)',
    author='Teoría de Algoritmos (TB024)'
)

styles = getSampleStyleSheet()

style_header_left = ParagraphStyle(
    'HeaderLeft',
    fontName='Arial',
    fontSize=9.5,
    leading=12,
    alignment=TA_LEFT,
    textColor=colors.HexColor('#222222')
)

style_header_center = ParagraphStyle(
    'HeaderCenter',
    fontName='Arial-Bold',
    fontSize=13,
    leading=16,
    alignment=TA_CENTER,
    textColor=colors.black
)

style_header_right = ParagraphStyle(
    'HeaderRight',
    fontName='Arial',
    fontSize=9.5,
    leading=12,
    alignment=TA_RIGHT,
    textColor=colors.HexColor('#222222')
)

style_student_left = ParagraphStyle(
    'StudentLeft',
    fontName='Arial',
    fontSize=9.5,
    leading=12,
    alignment=TA_LEFT,
    textColor=colors.black
)

style_student_right = ParagraphStyle(
    'StudentRight',
    fontName='Arial',
    fontSize=9.5,
    leading=12,
    alignment=TA_RIGHT,
    textColor=colors.black
)

style_table_header = ParagraphStyle(
    'TableHeader',
    fontName='Arial',
    fontSize=9.5,
    leading=11,
    alignment=TA_CENTER,
    textColor=colors.black
)

style_table_header_left = ParagraphStyle(
    'TableHeaderLeft',
    fontName='Arial',
    fontSize=9.5,
    leading=11,
    alignment=TA_LEFT,
    textColor=colors.black
)

style_instructions_1 = ParagraphStyle(
    'Instructions1',
    fontName='Arial-Bold',
    fontSize=8.5,
    leading=11,
    alignment=TA_LEFT,
    textColor=colors.HexColor('#111111')
)

style_instructions_2 = ParagraphStyle(
    'Instructions2',
    fontName='Arial-Bold',
    fontSize=8.5,
    leading=11,
    alignment=TA_LEFT,
    textColor=colors.HexColor('#111111')
)

style_exercise = ParagraphStyle(
    'Exercise',
    fontName='Arial',
    fontSize=9.3,
    leading=13.0,
    alignment=TA_JUSTIFY,
    textColor=colors.black
)

story = []

# 1. Encabezado superior (3 columnas)
header_data = [
    [
        Paragraph('Parcial 2º<br/>Oportunidad', style_header_left),
        Paragraph('<u>Teoria de Algoritmos (TB024)</u>', style_header_center),
        Paragraph('17 de noviembre de 2026', style_header_right)
    ]
]
t_header = Table(header_data, colWidths=[110, usable_width - 220, 110])
t_header.setStyle(TableStyle([
    ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
    ('BOTTOMPADDING', (0,0), (-1,-1), 0),
    ('TOPPADDING', (0,0), (-1,-1), 0),
    ('LEFTPADDING', (0,0), (-1,-1), 0),
    ('RIGHTPADDING', (0,0), (-1,-1), 0),
]))
story.append(t_header)

story.append(Spacer(1, 14))

# 2. Datos del alumno: Apellido y Nombres / Padrón
student_data = [
    [
        Paragraph('Apellido y Nombres: ............................................................................', style_student_left),
        Paragraph('Padrón: ....................', style_student_right)
    ]
]
t_student = Table(student_data, colWidths=[384, usable_width - 384])
t_student.setStyle(TableStyle([
    ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
    ('BOTTOMPADDING', (0,0), (-1,-1), 0),
    ('TOPPADDING', (0,0), (-1,-1), 0),
    ('LEFTPADDING', (0,0), (-1,-1), 0),
    ('RIGHTPADDING', (0,0), (-1,-1), 0),
]))
story.append(t_student)

story.append(Spacer(1, 10))

# 3. Tabla de calificaciones (ancho completo 519.28 pt)
table_data = [
    [
        Paragraph('Pregunta', style_table_header_left),
        Paragraph('1', style_table_header),
        Paragraph('2', style_table_header),
        Paragraph('3', style_table_header),
        Paragraph('4', style_table_header),
        Paragraph('5', style_table_header),
        Paragraph('6', style_table_header),
        Paragraph('Total', style_table_header)
    ],
    [
        Paragraph('Calificación', style_table_header_left),
        '', '', '', '', '', '', ''
    ]
]
# Columnas: Pregunta (93.28 pt), 1 a 6 (6 * 60 = 360 pt), Total (66 pt)
t_grade = Table(table_data, colWidths=[93.28, 60, 60, 60, 60, 60, 60, 66], rowHeights=[18, 24])
t_grade.setStyle(TableStyle([
    ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#333333')),
    ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
    ('ALIGN', (0,0), (0,-1), 'LEFT'),
    ('ALIGN', (1,0), (-1,-1), 'CENTER'),
    ('LEFTPADDING', (0,0), (-1,-1), 6),
    ('RIGHTPADDING', (0,0), (-1,-1), 6),
    ('TOPPADDING', (0,0), (-1,-1), 2),
    ('BOTTOMPADDING', (0,0), (-1,-1), 2),
]))
story.append(t_grade)

story.append(Spacer(1, 12))

# 4. Instrucciones en mayúsculas / negrita
story.append(Paragraph(
    'ENTREGAR CADA EJERCICIO EN UNA HOJA DIFERENTE CON NOMBRE EN TODAS LAS HOJAS. SI NO SE CUMPLE ESTO, SE RESTARÁ UN PUNTO A LA NOTA FINAL.',
    style_instructions_1
))

story.append(Spacer(1, 5))

story.append(Paragraph(
    'Sólo se pueden resolver 5 ejercicios. SI SE RESUELVEN LOS 6, LA NOTA DEL EJERCICIO 6 SE RESTARÁ AL RESULTADO DE LAS OTRAS 5.',
    style_instructions_2
))

story.append(Spacer(1, 12))

# 5. Enunciados de los ejercicios
exercises = [
    '<b>1- DIVISIÓN Y CONQUISTA.</b> Dada una lista de números enteros (positivos y negativos), se desea obtener la mayor diferencia entre dos elementos L[i] y L[j] tales que L[i]&lt; L[j] siendo i&lt; j. Realizar un algoritmo de DyC que resuelva el problema. Justificar la complejidad temporal del algoritmo realizado.',
    
    '<b>2- BACKTRACKING.</b> Una empresa debe asignar n tareas a m trabajadores. Cada tarea tiene una duración conocida d[i]. Algunas tareas son incompatibles entre sí y no pueden asignarse al mismo trabajador. Hay una matriz booleana de incompatibilidades. Ningún trabajador puede superar el tiempo máximo de trabajo T. Diseñar un algoritmo de backtracking que encuentre una solución válida al problema. Indicar la complejidad del algoritmo. Indicar los criterios de poda aplicados.',
    
    '<b>3- PROGRAMACIÓN DINÁMICA.</b> Una empresa tiene una serie de n proyectos disponibles para realizar el próximo año. Cada proyecto tiene: Una fecha de inicio i[i], una fecha de fin f[i] y un beneficio B[i]. Sabiendo que no puede realizar más de dos proyectos simultáneamente, realizar un algoritmo de programación dinámica que permita saber qué proyectos realizar para alcanzar el beneficio máximo. Indicar la complejidad del algoritmo desarrollado.',
    
    '<b>4- GREEDY.</b> Diseñar un algoritmo greedy que permita resolver el problema anterior. Si el algoritmo no asegura la solución óptima, indicar una instancia donde la solución obtenida sea la óptima y una instancia donde la solución obtenida no sea la óptima. Indicar la complejidad del algoritmo desarrollado.',
    
    '<b>5- PROGRAMACIÓN LINEAL.</b> Realizar un modelo de programación lineal que resuelva el problema del punto 3. Indicar la cantidad y tipo de variables del problema, y la cantidad de restricciones del mismo.',
    
    '<b>6- REDUCCIONES.</b> Se considera el problema de Independent Set: Dado un grafo no dirigido G=(V,E) y un entero k, determinar si existe un subconjunto de al menos k vértices tal que ningún par de vértices del subconjunto esté conectado por una arista. También se considera el problema de Vertex Cover: Dado un grafo no dirigido G\'=(V\',E\') y un entero k\', determinar si existe un subconjunto de como máximo k\' vértices que cubra todas las aristas del grafo. Es decir, cada arista debe tener al menos uno de sus extremos perteneciente al subconjunto seleccionado. Sabiendo que VC es NP-Completo, demostrar que Independent Set también lo es.'
]

for idx, ej in enumerate(exercises):
    story.append(Paragraph(ej, style_exercise))
    if idx < len(exercises) - 1:
        story.append(Spacer(1, 10.5))

doc.build(story)

reader = pypdf.PdfReader(pdf_path)
print(f'PDF generado exitosamente en: {pdf_path}')
print(f'Total de páginas: {len(reader.pages)}')
