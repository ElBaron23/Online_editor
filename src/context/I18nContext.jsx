import React, { createContext, useContext, useState, useEffect } from 'react';

const translations = {
    en: {
        "run_project": "Run Project",
        "explorer": "EXPLORER",
        "extensions": "Extensions",
        "settings": "Settings",
        "live_preview": "Live Preview",
        "dev_console": "Developer Console",
        "clear_console": "Clear Console",
        "close_panel": "Close Panel",
        "ready": "Ready",
        "console": "Console",
        "select_file_prompt": "Select a file to start coding",
        "drop_files_prompt": "Drop files here to upload",
        "download_project": "Download Project",
        "new_file": "New File",
        "new_folder": "New Folder",
        "rename": "Rename",
        "delete": "Delete",
        "preview_html": "Preview HTML",
        "format_code": "Format Code",
        "editor_settings": "Editor Settings",
        "auto_save": "Auto Save",
        "auto_save_delay": "Auto Save Delay (ms)",
        "autocomplete": "Autocomplete",
        "auto_close_tags": "Auto Close Tags",
        "language": "Language",
        "save_settings": "Save Settings",
        "cancel": "Cancel",
        "install": "Install",
        "uninstall": "Uninstall",
        "linter": "Live Code Linter",
        "linter_desc": "Real-time syntax checking (Red squiggles)",
        "color_picker": "Smart Color Picker",
        "color_picker_desc": "Visual color editor for CSS",
        "workspace_ide": "IDE",
        "workspace_logic": "Logic Gates",
        "workspace_circuit": "Arduino",
        "save_chip": "Save as Chip",
        "clear": "Clear",
        "truth_table": "Truth Table",
        "rename_gate": "Rename Gate/Pin",
        "wire_color": "Wire Color",
        "under_construction": "This workspace is under construction...",
        "switch_input": "Switch (Input)",
        "led_output": "LED (Output)",
        "edit_chip": "Edit Chip",
        "main_board": "Main Board",
        "print_pdf": "Print to PDF",
        "my_chips": "My Chips:",
        "delete_chip": "Delete Chip",
        "seven_segment": "7-Segment Display",
        "clock_generator": "Clock Generator"
    },
    ar: {
        "run_project": "تشغيل المشروع",
        "explorer": "المستكشف",
        "extensions": "الإضافات",
        "settings": "الإعدادات",
        "live_preview": "المعاينة المباشرة",
        "dev_console": "موجه المطورين",
        "clear_console": "مسح السجل",
        "close_panel": "إغلاق اللوحة",
        "ready": "جاهز",
        "console": "الكونسول",
        "select_file_prompt": "اختر ملفاً لتبدأ البرمجة",
        "drop_files_prompt": "أفلت الملفات هنا لرفعها",
        "download_project": "تحميل المشروع",
        "new_file": "ملف جديد",
        "new_folder": "مجلد جديد",
        "rename": "إعادة تسمية",
        "delete": "حذف",
        "preview_html": "معاينة HTML",
        "format_code": "تنسيق الكود",
        "editor_settings": "إعدادات المحرر",
        "auto_save": "الحفظ التلقائي",
        "auto_save_delay": "تأخير الحفظ التلقائي (ms)",
        "autocomplete": "الإكمال التلقائي",
        "auto_close_tags": "إغلاق الوسوم التلقائي",
        "language": "اللغة",
        "save_settings": "حفظ الإعدادات",
        "cancel": "إلغاء",
        "install": "تثبيت",
        "uninstall": "إزالة",
        "linter": "المدقق النحوي المباشر",
        "linter_desc": "تدقيق الأخطاء النحوية برمجياً (الخطوط الحمراء)",
        "color_picker": "منتقي الألوان الذكي",
        "color_picker_desc": "تعديل واختيار الألوان بصرياً لملفات الـ CSS",
        "workspace_ide": "محرر الكود",
        "workspace_logic": "البوابات المنطقية",
        "workspace_circuit": "أردوينو",
        "save_chip": "حفظ كرقاقة",
        "clear": "مسح اللوحة",
        "truth_table": "جدول الحقيقة",
        "rename_gate": "تعديل الاسم",
        "wire_color": "لون السلك",
        "under_construction": "مساحة العمل هذه قيد التطوير...",
        "switch_input": "مفتاح (مدخل)",
        "led_output": "مصباح (مخرج)",
        "edit_chip": "تعديل الرقاقة",
        "main_board": "اللوحة الرئيسية",
        "print_pdf": "طباعة / تصدير PDF",
        "my_chips": "رقاقاتي:",
        "delete_chip": "حذف الرقاقة",
        "seven_segment": "شاشة 7-Segment",
        "clock_generator": "مولد النبضات (Clock)"
    },
    fr: {
        "run_project": "Exécuter",
        "explorer": "EXPLORATEUR",
        "extensions": "Extensions",
        "settings": "Paramètres",
        "live_preview": "Aperçu en direct",
        "dev_console": "Console de développement",
        "clear_console": "Effacer la console",
        "close_panel": "Fermer",
        "ready": "Prêt",
        "console": "Console",
        "select_file_prompt": "Sélectionnez un fichier",
        "drop_files_prompt": "Déposez les fichiers ici",
        "download_project": "Télécharger le projet",
        "new_file": "Nouveau Fichier",
        "new_folder": "Nouveau Dossier",
        "rename": "Renommer",
        "delete": "Supprimer",
        "preview_html": "Aperçu HTML",
        "format_code": "Formater le code",
        "editor_settings": "Paramètres de l'éditeur",
        "auto_save": "Sauvegarde auto",
        "auto_save_delay": "Délai (ms)",
        "autocomplete": "Saisie semi-automatique",
        "auto_close_tags": "Fermeture auto des balises",
        "language": "Langue",
        "save_settings": "Sauvegarder",
        "cancel": "Annuler",
        "install": "Installer",
        "uninstall": "Désinstaller",
        "linter": "Correcteur de code",
        "linter_desc": "Vérification syntaxique en temps réel",
        "color_picker": "Sélecteur de couleurs",
        "color_picker_desc": "Éditeur visuel de couleurs pour CSS",
        "workspace_ide": "IDE",
        "workspace_logic": "Portes Logiques",
        "workspace_circuit": "Arduino",
        "save_chip": "Sauvegarder la Puce",
        "clear": "Effacer",
        "truth_table": "Table de Vérité",
        "rename_gate": "Renommer la Porte/Broche",
        "wire_color": "Couleur du Fil",
        "under_construction": "Cet espace de travail est en construction...",
        "switch_input": "Interrupteur (Entrée)",
        "led_output": "LED (Sortie)",
        "edit_chip": "Modifier la Puce",
        "main_board": "Carte Principale",
        "print_pdf": "Imprimer en PDF",
        "my_chips": "Mes Puces:",
        "delete_chip": "Supprimer la Puce",
        "seven_segment": "Afficheur 7-Segments",
        "clock_generator": "Générateur d'Horloge"
    }
};

const I18nContext = createContext(null);

export function I18nProvider({ children }) {
    const [language, setLanguageState] = useState(() => localStorage.getItem('ide_language') || 'en');

    const changeLanguage = (lang) => {
        if (!translations[lang]) return;
        setLanguageState(lang);
        localStorage.setItem('ide_language', lang);
    };

    useEffect(() => {
        if (language === 'ar') {
            document.documentElement.dir = 'rtl';
            document.documentElement.lang = 'ar';
        } else {
            document.documentElement.dir = 'ltr';
            document.documentElement.lang = language;
        }
    }, [language]);

    const t = (key) => {
        return translations[language]?.[key] || translations['en']?.[key] || key;
    };

    return (
        <I18nContext.Provider value={{ language, changeLanguage, t }}>
            {children}
        </I18nContext.Provider>
    );
}

export function useTranslation() {
    return useContext(I18nContext);
}
