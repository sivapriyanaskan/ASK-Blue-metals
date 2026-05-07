// Edit screen reuses the unified Currency Exchange create/edit component.
// The component branches on `useParams().id` to load existing data and PATCH on save.
export { CurrencyExchange as CurrencyExchangeEdit } from './CurrencyExchange';
