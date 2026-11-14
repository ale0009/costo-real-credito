# How much does this loan really cost?

[Español](README.md) · **English**

A one-job web page: it shows the **real** cost of a loan, including insurance, fees and up-front charges, and compares it with Colombia's current **usury cap**. The interface is in Spanish.

> **This is not financial advice.** It is an educational calculator. The figures of a real loan are the ones in the contract. It does not recommend products or lenders.

- **Input:** amount, term, rate (effective annual **EA**, nominal annual compounded monthly **NMV**, or monthly **MV**), borrower life insurance (monthly % of the balance or a fixed amount), fixed monthly fees and up-front charges.
- **Output:** the rate in its three forms, the fixed payment (French amortization), the full amortization schedule, total paid, total interest and the **effective cost**: the monthly IRR of the cash flows, annualized (computed here).
- **Usury cap:** a traffic light against the Superintendencia Financiera de Colombia certification (usury = 1.5 × current banking interest rate), with resolution number, validity dates and source. Fetched live from datos.gov.co (open CORS API); falls back to `datos/usura.json`, or forced with `?sin-conexion`.
- `/proceso/`: problem, class exercises turned into tests, formulas, three SVG charts, design decisions, limitations, errata and sources.

## Key figures

- Current banking interest, consumer and ordinary credit: **18.89 % EA**; usury cap **28.34 % EA** (Resolution 1707 of 2026, valid 1–30 November 2026).
- Fictitious example (COP 10,000,000, 36 months, 24 % EA, 0.1 % monthly insurance, COP 5,000 monthly fee, COP 100,000 up-front): payment COP 380,381; effective cost **27.60 % EA** (computed here).

## Usage

```bash
python3 -m http.server 8000
node --test   # 32 tests, Node 20+
```

## Origin

Built from Mario and David's 2024 Financial Mathematics coursework (simple and compound interest, equivalent rates, annuities). Its solved exercises are the test cases; mistakes found in them are documented in the errata.

## Credits

[Mario Puerta «ale0009»](https://github.com/ale0009) × [David Rincón «Kuronoma»](https://www.linkedin.com/in/davidalexanderrinconcorredorkuronoma/). MIT License.
