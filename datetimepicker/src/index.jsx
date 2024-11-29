import React from 'react';
import ReactDOM from 'react-dom/client';
import { DateRangePicker } from 'rsuite';
import 'rsuite/dist/rsuite.css';
document.head.insertAdjacentHTML('beforeend', `<style>.rs-calendar-time-dropdown-column ::after {display: none;}</style>`);
ReactDOM.createRoot(document.getElementById('root')).render(<DateRangePicker showOneCalendar ranges={[]} format="dd/MM/yyyy, HH:mm" />);