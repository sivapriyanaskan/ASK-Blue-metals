import { createBrowserRouter } from 'react-router';
import { Login } from './pages/Login';
import { Logout } from './pages/Logout';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';

// Masters — live backend
import { CustomerMaster } from './pages/CustomerMaster';
import { SupplierMaster } from './pages/SupplierMaster';
import { ItemMaster } from './pages/ItemMaster';
import { ItemGroupMaster } from './pages/ItemGroupMaster';
import { ItemSubGroupMaster } from './pages/ItemSubGroupMaster';
import { VehicleMasterList } from './pages/VehicleMasterList';
import { VehicleMasterCreate } from './pages/VehicleMasterCreate';
import { VehicleMasterEdit } from './pages/VehicleMasterEdit';
import { VehicleMasterView } from './pages/VehicleMasterView';
import { WorkCentreMasterList } from './pages/WorkCentreMasterList';
import { WorkCentreMasterCreate } from './pages/WorkCentreMasterCreate';
import { WorkCentreMasterEdit } from './pages/WorkCentreMasterEdit';
import { WorkCentreMasterView } from './pages/WorkCentreMasterView';
import { DriverLabourMasterList } from './pages/DriverLabourMasterList';
import { DriverLabourMasterCreate } from './pages/DriverLabourMasterCreate';
import { DriverLabourMasterEdit } from './pages/DriverLabourMasterEdit';
import { DriverLabourMasterView } from './pages/DriverLabourMasterView';
import { BillSundryMaster } from './pages/BillSundryMaster';
import { AccountMaster } from './pages/AccountMaster';
import { BankMaster } from './pages/BankMaster';
import { PrinterMaster } from './pages/PrinterMaster';
import { PrinterSettings } from './pages/PrinterSettings';
import { CustomerWiseItemRates } from './pages/CustomerWiseItemRates';
import { SupplierWiseItemRates } from './pages/SupplierWiseItemRates';
import { FreezeItemToCustomer } from './pages/FreezeItemToCustomer';

// Operations — Token + Sales Bill (live backend)
import { TokenList } from './pages/TokenList';
import { TokenCreation } from './pages/TokenCreation';
import { TokenDetails } from './pages/TokenDetails';
import { SalesBillList } from './pages/SalesBillList';
import { SalesBill } from './pages/SalesBill';
import { SalesBillDetails } from './pages/SalesBillDetails';
import { WeightSlipCreate } from './pages/WeightSlipCreate';

// Operations — Purchase Entry Pass
import { PurchaseEntryPassList } from './pages/PurchaseEntryPassList';
import { PurchaseEntryPassCreate } from './pages/PurchaseEntryPassCreate';
import { PurchaseEntryPass } from './pages/PurchaseEntryPass';
import { PurchaseEntryPassDetails } from './pages/PurchaseEntryPassDetails';

// Operations — Purchase Bill
import { PurchaseBillList } from './pages/PurchaseBillList';
import { PurchaseBillCreate } from './pages/PurchaseBillCreate';
import { PurchaseBill } from './pages/PurchaseBill';
import { PurchaseBillDetails } from './pages/PurchaseBillDetails';

// Production — Raw Material
import { RawMaterialItemWiseList } from './pages/RawMaterialItemWiseList';
import { RawMaterialItemWise } from './pages/RawMaterialItemWise';
import { RawMaterialItemWiseEdit } from './pages/RawMaterialItemWiseEdit';
import { RawMaterialItemWiseDetails } from './pages/RawMaterialItemWiseDetails';
import { RawMaterialPurchaseWiseList } from './pages/RawMaterialPurchaseWiseList';
import { RawMaterialPurchaseWise } from './pages/RawMaterialPurchaseWise';
import { RawMaterialPurchaseWiseEdit } from './pages/RawMaterialPurchaseWiseEdit';
import { RawMaterialPurchaseWiseDetails } from './pages/RawMaterialPurchaseWiseDetails';

// Finance — Currency Exchange
import { CurrencyExchangeList } from './pages/CurrencyExchangeList';
import { CurrencyExchange } from './pages/CurrencyExchange';
import { CurrencyExchangeEdit } from './pages/CurrencyExchangeEdit';
import { CurrencyExchangeDetails } from './pages/CurrencyExchangeDetails';

// Finance — Cash Voucher
import { CashVoucherList } from './pages/CashVoucherList';
import { CashVoucherEdit } from './pages/CashVoucherEdit';
import { CashVoucherDetails } from './pages/CashVoucherDetails';
import { CashVoucherPayment } from './pages/CashVoucherPayment';

// Fuel Consumption
import { FuelConsumptionList } from './pages/FuelConsumptionList';
import { FuelConsumptionCreate } from './pages/FuelConsumptionCreate';
import { FuelConsumptionEdit } from './pages/FuelConsumptionEdit';
import { FuelConsumptionView } from './pages/FuelConsumptionView';

// Shift Management
import { ShiftManagementList } from './pages/ShiftManagementList';
import { ShiftManagementCreate } from './pages/ShiftManagementCreate';
import { ShiftManagementEdit } from './pages/ShiftManagementEdit';
import { ShiftManagementDetails } from './pages/ShiftManagementDetails';
import { ShiftOpen } from './pages/ShiftOpen';
import { ShiftClosing } from './pages/ShiftClosing';
import { ShiftTransferDenominationsList } from './pages/ShiftTransferDenominationsList';
import { ShiftTransferDenominationsEdit } from './pages/ShiftTransferDenominationsEdit';
import { ShiftTransferDenominationsDetails } from './pages/ShiftTransferDenominationsDetails';

// Reports
import { SalesRegister } from './pages/SalesRegister';
import { SalesWithGSTFullQty } from './pages/SalesWithGSTFullQty';
import { SalesWithoutGSTFullQty } from './pages/SalesWithoutGSTFullQty';
import { SalesWithoutGSTHalfQty } from './pages/SalesWithoutGSTHalfQty';
import { SalesGSTCombined } from './pages/SalesGSTCombined';
import { SalesCustomerWise } from './pages/SalesCustomerWise';
import { PurchaseRegister } from './pages/PurchaseRegister';
import { PurchaseItemWise } from './pages/PurchaseItemWise';
import { PurchaseSupplierWise } from './pages/PurchaseSupplierWise';
import { ProductionRegister } from './pages/ProductionRegister';
import { ProductionItemWise } from './pages/ProductionItemWise';
import { ProductionPurchaseWise } from './pages/ProductionPurchaseWise';
import { FuelRegister } from './pages/FuelRegister';
import { ShiftClosingReport } from './pages/ShiftClosingReport';
import { CustomerLedger } from './pages/CustomerLedger';
import { SupplierLedger } from './pages/SupplierLedger';
import { ItemStockReport } from './pages/ItemStockReport';
import { VehicleHistory } from './pages/VehicleHistory';
import { DriverBATAReport } from './pages/DriverBATAReport';
import { EditLogReport } from './pages/EditLogReport';

// Settings / IAM
import { Settings } from './pages/Settings';
import { RoleMenuAccess } from './pages/RoleMenuAccess';
import { CommonPrinterSettingsList } from './pages/CommonPrinterSettingsList';
import { CommonPrinterSettingsCreate } from './pages/CommonPrinterSettingsCreate';
import { CommonPrinterSettingsEdit } from './pages/CommonPrinterSettingsEdit';
import { CommonPrinterSettingsDetails } from './pages/CommonPrinterSettingsDetails';
import { UserManagement } from './pages/UserManagement';
import { UserView } from './pages/UserView';
import { AuditLogs } from './pages/AuditLogs';

export const router = createBrowserRouter([
  { path: '/login', Component: Login },
  { path: '/logout', Component: Logout },
  {
    path: '/',
    Component: ProtectedRoute,
    children: [
      {
        path: '/',
        Component: Layout,
        children: [
          { index: true, Component: Dashboard },

          // ── Operations: Token ──────────────────────────────────────────────
          { path: 'operations/token', Component: TokenList },
          { path: 'operations/token/create', Component: TokenCreation },
          { path: 'operations/token/:id', Component: TokenDetails },
          { path: 'operations/token-cancel', Component: TokenList },
          { path: 'operations/token-list', Component: TokenList },
          { path: 'operations/token-creation', Component: TokenCreation },
          { path: 'operations/weight-slip/create', Component: WeightSlipCreate },

          // ── Operations: Purchase Entry Pass ────────────────────────────────
          { path: 'operations/purchase-entry-pass', Component: PurchaseEntryPassList },
          { path: 'operations/purchase-entry-pass/create', Component: PurchaseEntryPassCreate },
          { path: 'operations/purchase-entry-pass/edit/:id', Component: PurchaseEntryPass },
          { path: 'operations/purchase-entry-pass/:id', Component: PurchaseEntryPassDetails },

          // ── Operations: Sales Bill ─────────────────────────────────────────
          { path: 'operations/sales-bill', Component: SalesBillList },
          { path: 'operations/sales-bill/create', Component: SalesBill },
          { path: 'operations/sales-bill/:id', Component: SalesBillDetails },

          // ── Operations: Purchase Bill ──────────────────────────────────────
          { path: 'operations/purchase-bill', Component: PurchaseBillList },
          { path: 'operations/purchase-bill/create', Component: PurchaseBillCreate },
          { path: 'operations/purchase-bill/edit/:id', Component: PurchaseBill },
          { path: 'operations/purchase-bill/:id', Component: PurchaseBillDetails },

          // ── Masters ────────────────────────────────────────────────────────
          { path: 'masters/customer', Component: CustomerMaster },
          { path: 'masters/supplier', Component: SupplierMaster },
          { path: 'masters/item', Component: ItemMaster },
          { path: 'masters/item-group', Component: ItemGroupMaster },
          { path: 'masters/item-sub-group', Component: ItemSubGroupMaster },
          { path: 'masters/customer-wise-item-rates', Component: CustomerWiseItemRates },
          { path: 'masters/supplier-rate', Component: SupplierWiseItemRates },
          { path: 'masters/supplier-wise-item-rates', Component: SupplierWiseItemRates },
          { path: 'masters/freeze', Component: FreezeItemToCustomer },

          { path: 'masters/vehicle', Component: VehicleMasterList },
          { path: 'masters/vehicle/create', Component: VehicleMasterCreate },
          { path: 'masters/vehicle/:id/edit', Component: VehicleMasterEdit },
          { path: 'masters/vehicle/:id', Component: VehicleMasterView },

          { path: 'masters/work-centre', Component: WorkCentreMasterList },
          { path: 'masters/work-centre/create', Component: WorkCentreMasterCreate },
          { path: 'masters/work-centre/:id/edit', Component: WorkCentreMasterEdit },
          { path: 'masters/work-centre/:id', Component: WorkCentreMasterView },

          { path: 'masters/driver-labour', Component: DriverLabourMasterList },
          { path: 'masters/driver-labour/create', Component: DriverLabourMasterCreate },
          { path: 'masters/driver-labour/:id/edit', Component: DriverLabourMasterEdit },
          { path: 'masters/driver-labour/:id', Component: DriverLabourMasterView },
          { path: 'masters/driver', Component: DriverLabourMasterList },
          { path: 'masters/driver/create', Component: DriverLabourMasterCreate },
          { path: 'masters/driver/:id/edit', Component: DriverLabourMasterEdit },
          { path: 'masters/driver/:id', Component: DriverLabourMasterView },

          { path: 'masters/bill-sundry', Component: BillSundryMaster },
          { path: 'masters/account-master', Component: AccountMaster },
          { path: 'masters/bank-master', Component: BankMaster },
          { path: 'masters/printer-master', Component: PrinterMaster },
          { path: 'masters/printer', Component: PrinterSettings },

          // ── Production ─────────────────────────────────────────────────────
          { path: 'production/item-wise', Component: RawMaterialItemWiseList },
          { path: 'production/item-wise/create', Component: RawMaterialItemWiseEdit },
          { path: 'production/item-wise/edit/:id', Component: RawMaterialItemWiseEdit },
          { path: 'production/item-wise/:id', Component: RawMaterialItemWiseDetails },

          { path: 'production/purchase-wise', Component: RawMaterialPurchaseWiseList },
          { path: 'production/purchase-wise/create', Component: RawMaterialPurchaseWiseEdit },
          { path: 'production/purchase-wise/edit/:id', Component: RawMaterialPurchaseWiseEdit },
          { path: 'production/purchase-wise/:id', Component: RawMaterialPurchaseWiseDetails },

          // ── Finance: Currency Exchange ─────────────────────────────────────
          { path: 'finance/currency-exchange', Component: CurrencyExchangeList },
          { path: 'currency-exchange', Component: CurrencyExchangeList },
          { path: 'currency-exchange/create', Component: CurrencyExchange },
          { path: 'currency-exchange/edit/:id', Component: CurrencyExchangeEdit },
          { path: 'currency-exchange/view/:id', Component: CurrencyExchangeDetails },
          { path: 'finance/currency-exchange/create', Component: CurrencyExchange },
          { path: 'finance/currency-exchange/edit/:id', Component: CurrencyExchangeEdit },
          { path: 'finance/currency-exchange/:id', Component: CurrencyExchangeDetails },

          // ── Finance: Cash Voucher ──────────────────────────────────────────
          { path: 'finance/cash-voucher', Component: CashVoucherList },
          { path: 'cash-voucher', Component: CashVoucherList },
          { path: 'cash-voucher/create', Component: CashVoucherEdit },
          { path: 'cash-voucher/edit/:id', Component: CashVoucherEdit },
          { path: 'cash-voucher/payment/:id', Component: CashVoucherPayment },
          { path: 'cash-voucher/:id', Component: CashVoucherDetails },
          { path: 'finance/cash-voucher/create', Component: CashVoucherEdit },
          { path: 'finance/cash-voucher/edit/:id', Component: CashVoucherEdit },
          { path: 'finance/cash-voucher/payment/:id', Component: CashVoucherPayment },
          { path: 'finance/cash-voucher/:id', Component: CashVoucherDetails },

          // ── Fuel ───────────────────────────────────────────────────────────
          { path: 'fuel/consumption', Component: FuelConsumptionList },
          { path: 'fuel/consumption/create', Component: FuelConsumptionCreate },
          { path: 'fuel/consumption/:id/edit', Component: FuelConsumptionEdit },
          { path: 'fuel/consumption/:id', Component: FuelConsumptionView },

          // ── Shift Management ───────────────────────────────────────────────
          { path: 'shift-management', Component: ShiftManagementList },
          { path: 'shift-management/shift-open', Component: ShiftOpen },
          { path: 'shift-management/shift-close', Component: ShiftClosing },
          { path: 'shift-management/create', Component: ShiftManagementCreate },
          { path: 'shift-management/edit/:id', Component: ShiftManagementEdit },
          { path: 'shift-management/:id', Component: ShiftManagementDetails },
          { path: 'shift-management/transfer', Component: ShiftTransferDenominationsList },
          { path: 'shift-management/transfer/edit/:id', Component: ShiftTransferDenominationsEdit },
          { path: 'shift-management/transfer/:id', Component: ShiftTransferDenominationsDetails },

          // ── Reports ────────────────────────────────────────────────────────
          { path: 'reports/sales-register', Component: SalesRegister },
          { path: 'reports/sales-with-gst-full-qty', Component: SalesWithGSTFullQty },
          { path: 'reports/sales-without-gst-full-qty', Component: SalesWithoutGSTFullQty },
          { path: 'reports/sales-without-gst-half-qty', Component: SalesWithoutGSTHalfQty },
          { path: 'reports/sales-gst-combined', Component: SalesGSTCombined },
          { path: 'reports/sales-customer-wise', Component: SalesCustomerWise },
          { path: 'reports/purchase-register', Component: PurchaseRegister },
          { path: 'reports/purchase-item-wise', Component: PurchaseItemWise },
          { path: 'reports/purchase-supplier-wise', Component: PurchaseSupplierWise },
          { path: 'reports/production-register', Component: ProductionRegister },
          { path: 'reports/production-item-wise', Component: ProductionItemWise },
          { path: 'reports/production-purchase-wise', Component: ProductionPurchaseWise },
          { path: 'reports/fuel-register', Component: FuelRegister },
          { path: 'reports/shift-closing', Component: ShiftClosingReport },
          { path: 'reports/customer-ledger', Component: CustomerLedger },
          { path: 'reports/supplier-ledger', Component: SupplierLedger },
          { path: 'reports/item-stock', Component: ItemStockReport },
          { path: 'reports/vehicle-history', Component: VehicleHistory },
          { path: 'reports/driver-bata', Component: DriverBATAReport },
          { path: 'reports/edit-log', Component: EditLogReport },

          // ── Admin (IAM) ────────────────────────────────────────────────────
          { path: 'admin/audit-logs', Component: AuditLogs },
          { path: 'admin/users', Component: UserManagement },
          { path: 'admin/users/:id', Component: UserView },

          // ── Settings ───────────────────────────────────────────────────────
          { path: 'settings', Component: Settings },
          { path: 'settings/roles', Component: RoleMenuAccess },
          { path: 'settings/token-details', Component: TokenList },
          { path: 'settings/token-list', Component: TokenList },
          { path: 'settings/common-printer', Component: CommonPrinterSettingsList },
          { path: 'settings/common-printer/create', Component: CommonPrinterSettingsCreate },
          { path: 'settings/common-printer/:id/edit', Component: CommonPrinterSettingsEdit },
          { path: 'settings/common-printer/:id', Component: CommonPrinterSettingsDetails },

          // ── Sales Bill aliases ─────────────────────────────────────────────
          { path: 'sales-bills', Component: SalesBillList },
          { path: 'sales-bills/:id', Component: SalesBillDetails },
        ],
      },
    ],
  },
]);
