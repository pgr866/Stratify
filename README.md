# Requisitos Funcionales
- Login
- Google Login
- GitHub Login
- Registrarse
- Recuperar contraseña
- Configurar Api Keys
- Crear Estrategia
- Configurar Estrategia
    - Añadir indicadores estadísticos a estrategia
    - Configurar condiciones de compra y venta
    - Cálculo de parámetros óptimos de una estrategia (maximizando beneficio) en función de datos históricos
- Ejecutar Estrategia Backtest (simulado con datos históricos)
- Ejecutar Estrategia Dry-run (simulado en tiempo real)
- Ejecutar Estrategia Real
- Visualizar gráfico de velas
- Visualizar lista de operaciones
- Visualizar Resultados Estrategia (estadísticas)
- Visualizar Dashboard personal (estadísticas)
- Explorar Estrategias públicas con filtros como rentabilidad
- Marcar Estrategia como favorita
- Copy-Trading de estrategias públicas

# Enlaces
https://pandas.pydata.org/docs/

https://ta-lib.github.io/ta-lib-python/funcs.html

https://docs.ccxt.com/

https://ui.shadcn.com/

https://www.tradingview.com/lightweight-charts/

# Dependencias frontend

- Follow https://ui.shadcn.com/docs/installation/vite

```bash
npx shadcn@latest add accordion avatar badge button calendar card chart command dialog dropdown-menu input-otp input label navigation-menu popover resizable scroll-area select separator sheet sonner tabs
```
```bash
npm i --legacy-peer-deps axios @react-oauth/google lightweight-charts date-fns-tz @radix-ui/react-icons react-router-dom
```