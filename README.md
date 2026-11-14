# ¿Cuánto te cuesta de verdad este crédito?

**Español** · [English](README.en.md)

Una página que hace una sola cosa: dice cuánto cuesta **de verdad** un crédito, con seguros, cargos y comisiones incluidos, y lo compara con la **tasa de usura** vigente en Colombia.

> **Esto no es asesoría financiera.** Es una calculadora educativa. Las cifras de un crédito real son las del contrato; pídele a la entidad la tasa efectiva anual y el costo total. No recomienda productos ni entidades.

- **Entrada:** monto, plazo, tasa (efectiva anual **EA**, nominal mes vencido **NMV** o mensual vencida **MV**), seguro de vida deudor (% mensual sobre el saldo o valor fijo), cargos fijos mensuales y comisiones iniciales.
- **Salida:** conversión de la tasa a sus tres formas, cuota fija (sistema francés), tabla de amortización completa (cuota, interés, capital, seguro, cargos, saldo), total pagado, total de intereses y el **costo efectivo**: la TIR mensual de lo que recibes y pagas, llevada a EA (calculado aquí).
- **Usura:** semáforo frente a la certificación de la Superintendencia Financiera (usura = 1,5 × interés bancario corriente), con resolución, vigencia y fuente. Se consulta en vivo en datos.gov.co (API con CORS abierto) y, si falla o con `?sin-conexion`, se usa la copia de `datos/usura.json`.
- `/proceso/`: el problema, los talleres de clase convertidos en pruebas, las fórmulas, tres gráficas SVG, la usura, decisiones de diseño, limitaciones, fe de erratas y fuentes.

## Cifras clave

| Dato | Valor | Fuente |
|---|---|---|
| Interés bancario corriente, consumo y ordinario | 18,89 % EA | Superfinanciera, Resolución 1707 de 2026 (vigente del 1 al 30 de noviembre de 2026) |
| Tasa de usura, consumo y ordinario | 28,34 % EA | 1,5 × IBC; coincide con lo publicado por la Superfinanciera |
| Ejemplo ficticio: 10 millones de pesos, 36 meses, 24 % EA, seguro 0,1 % mensual, $ 5.000 al mes, $ 100.000 de comisión | cuota $ 380.381; costo efectivo **27,60 % EA** (26,10 % sin seguro) | calculado aquí |

## Uso

```bash
python3 -m http.server 8000   # y abrir http://localhost:8000
node --test                   # 32 pruebas (Node 20 o superior)
```

Para GitHub Pages basta con servir la rama `main` desde la raíz; todas las rutas son relativas.

## Estructura

```
index.html, proceso/index.html   las dos páginas (sin build)
css/estilo.css                   línea "Tinta y trama" (claro) y "Jisseki" (oscuro)
js/tasas.js                      EA ↔ MV ↔ NMV, valor presente, anualidades, lectura de números
js/credito.js                    cuota francesa, tabla de amortización, TIR (Newton + bisección), costo efectivo
js/usura.js                      usura = 1,5 × IBC, lectura de la API de datos.gov.co, semáforo
js/formato.js                    pesos, porcentajes y fechas en español
js/ejemplo.js                    el crédito de ejemplo (ficticio)
js/main.js, js/proceso.js, js/tema.js   interfaz y gráficas
datos/usura.json                 certificación vigente e histórico 2022–2026 (respaldo sin conexión)
test/                            pruebas node --test (13 salen de ejercicios de clase)
```

## Limitaciones

Crédito simple: tasa fija, cuotas mensuales vencidas iguales, sin gracia, abonos extra ni mora. Sin IVA. La comparación con la usura es orientativa: usa el costo con cargos y comisiones, sin seguros (Ley 45 de 1990, art. 68), y la certificación vigente hoy.

## De qué trabajo sale

De los talleres y parciales de **Matemáticas Financieras** (2024): interés simple y compuesto, tasas equivalentes y anualidades. Sus ejercicios resueltos son las pruebas de la lógica; los errores que tenían están corregidos en la fe de erratas de `/proceso/`.

## Créditos

[Mario Puerta «ale0009»](https://github.com/ale0009) × [David Rincón «Kuronoma»](https://www.linkedin.com/in/davidalexanderrinconcorredorkuronoma/). Licencia MIT.
