import { Permissions } from "../types";

export const PERMISSION_CATEGORIES = {
  dashboard: {
    label: "لوحة التحكم",
    permissions: {
      view: "عرض لوحة التحكم",
    },
  },
  banks: {
    label: "المصارف",
    permissions: {
      view: "عرض المصارف",
      add: "إضافة مصرف",
      edit: "تعديل مصرف",
      delete: "حذف مصرف",
      deposit: "إيداع بنكي",
      withdraw: "سحب بنكي",
      transfer: "تحويل بين المصارف",
      exchange: "بدل من مصرف لخزنة",
    },
  },
  debts: {
    label: "الديون",
    permissions: {
      view: "عرض الديون",
      addCustomer: "إضافة زبون",
      addDebt: "تسجيل دين جديد",
      payDebt: "تسجيل دفعة دين",
      archive: "أرشفة واستعادة زبون",
    },
  },
  pos: {
    label: "ماكينة P.O.S",
    permissions: {
      view: "عرض صفحة P.O.S",
      add: "إضافة معاملة",
      archive: "أرشفة واستعادة معاملة",
      delete: "حذف نهائي مع عكس القيمة",
    },
  },
  dollarCards: {
    label: "شراء بطاقات الدولار",
    permissions: {
      view: "عرض عمليات الشراء النشطة",
      add: "بدء عملية شراء جديدة",
      edit: "تعديل بيانات الزبون",
      addPayment: "إضافة دفعة",
      editPayment: "تعديل دفعة",
      deletePayment: "حذف دفعة",
      complete: "إتمام العملية واستلام الدولار",
      archive: "نقل للمهملات واستعادة",
      delete: "حذف نهائي من المهملات",
      reportToTelegram: "إرسال تقرير للتيليجرام"
    },
  },
  dollarCardHistory: {
    label: "سجل بطاقات الدولار",
    permissions: {
      view: "عرض سجل العمليات",
      editCustomer: "تعديل بيانات الزبون",
      reportToTelegram: "إرسال تقرير للتيليجرام",
    },
  },
  operatingCosts: {
    label: "التكاليف التشغيلية",
    permissions: {
      view: "عرض التكاليف",
      add: "إضافة مصروف",
      edit: "تعديل مصروف",
      delete: "حذف مصروف",
      manageTypes: "إدارة أنواع المصاريف",
    },
  },
  receivables: {
    label: "المستحقات",
    permissions: {
      view: "عرض المستحقات",
      add: "إضافة مستحق",
      pay: "تسجيل دفعة مستحق",
      archive: "أرشفة واستعادة مستحق",
      deleteArchived: "حذف المستحقات المؤرشفة نهائياً",
    },
  },
  transactions: {
    label: "كل المعاملات",
    permissions: {
      view: "عرض كل المعاملات",
      export: "طباعة تقرير",
    },
  },
  cashFlow: {
    label: "دخول وخروج",
    permissions: {
      view: "عرض صفحة الدخول والخروج",
    },
  },
  incompleteTrades: {
    label: "بيع وشراء غير مكتمل",
    permissions: {
      view: "عرض الصفحة",
      confirm: "تأكيد المعاملات",
      edit: "تعديل المعاملات",
      delete: "حذف المعاملات",
    },
  },
  transactionManagement: {
      label: "إدارة المعاملات",
      permissions: {
          view: "عرض صفحة إدارة المعاملات",
          edit: "تعديل معاملة",
          delete: "حذف معاملة",
          restore: "استعادة معاملة محذوفة",
      }
  },
  users: {
    label: "المستخدمين",
    permissions: {
      view: "عرض المستخدمين",
      add: "إضافة مستخدم",
      edit: "تعديل مستخدم",
      delete: "حذف مستخدم",
    },
  },
  dailyClosing: {
    label: "الإغلاق اليومي",
    permissions: {
        view: "عرض تقرير الإغلاق اليومي",
        forceClose: "إغلاق يومي إجباري وترحيل الأرصدة",
    },
  },
  dailyTransactions: {
      label: "المعاملات السريعة",
      permissions: {
          buySellUsd: "صلاحية شراء وبيع الدولار",
          buySellOther: "صلاحية شراء وبيع عملات أخرى",
          adjustBalance: "صلاحية إدخال وإخراج نقدي مباشر",
          dollarExchange: "بدل عملات بين الخزنات",
      }
  },
  telegram: {
    label: "إعدادات تليجرام",
    permissions: {
        view: "عرض وتعديل إعدادات تليجرام",
    },
  },
  dashboardSettings: {
    label: "إعدادات لوحة التحكم",
    permissions: {
      view: "عرض وتعديل إعدادات لوحة التحكم",
    },
  },
  dataManagement: {
    label: "إدارة البيانات",
    permissions: {
      view: "الوصول لصفحة إدارة البيانات",
      import: "استيراد البيانات",
      export: "تصدير البيانات",
    }
  },
  externalValues: {
    label: "خارج الخزنة",
    permissions: {
      view: "عرض القيم خارج الخزنة",
      add: "إضافة قيمة",
      edit: "تعديل قيمة",
      delete: "حذف قيمة",
    },
  },
  closing: {
    label: "الإغلاق",
    permissions: {
      view: "عرض صفحة الإغلاق",
      calculate: "تحديث وحساب رأس المال"
    }
  }
};

export const generateFullPermissions = (): Permissions => {
  const permissions: any = {};
  for (const category in PERMISSION_CATEGORIES) {
    permissions[category] = {};
    for (const p in PERMISSION_CATEGORIES[category as keyof typeof PERMISSION_CATEGORIES].permissions) {
      permissions[category][p] = true;
    }
  }
  return permissions as Permissions;
};

export const generateEmptyPermissions = (): Permissions => {
    const permissions: any = {};
    for (const category in PERMISSION_CATEGORIES) {
      permissions[category] = {};
      for (const p in PERMISSION_CATEGORIES[category as keyof typeof PERMISSION_CATEGORIES].permissions) {
        permissions[category][p] = false;
      }
    }
    return permissions as Permissions;
};