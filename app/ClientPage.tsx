"use client";

// ==================== ייבוא ספריות (IMPORTS) ====================
import * as XLSX from 'xlsx';
import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Search, Plus, FileText, Trash2, X, Key, Lock, Unlock, Edit,
    ExternalLink, Copy, Check, LayoutGrid, Link as LinkIcon, File, Eye, Upload, Download, EyeOff, GripVertical, Gift, Folder
} from 'lucide-react';
import {
    DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors,
} from '@dnd-kit/core';
import {
    arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import IndependenceDayDecor from '@/components/IndependenceDayDecor';
import MemorialDayBanner, { MemorialType } from '@/components/MemorialDayBanner';
// ==================== רכיבי עזר (HELPER COMPONENTS) ====================

// רכיב: שורה הניתנת לגרירה בטבלת ספר הטלפונים
function SortableRow({ row, phonebookSchema, isPhonebookEditMode, updatePhonebookCell, deletePhonebookRow }: any) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: row.id });
    const style = { transform: CSS.Transform.toString(transform), transition, zIndex: isDragging ? 50 : 0, position: 'relative' as 'relative' };

    return (
        <tr ref={setNodeRef} style={style} className={`group transition-all duration-500 ease-in-out bg-white rounded-[1.5rem] border-2 border-slate-50 shadow-sm hover:shadow-xl hover:shadow-amber-200/20 ${isDragging ? 'opacity-50 shadow-2xl scale-[1.02] z-50' : ''} hover:border-transparent hover:bg-gradient-to-l hover:from-amber-400 hover:to-yellow-500 hover:-translate-y-1.5 cursor-default`}>
            {/* ידית גרירה לשורה */}
            {isPhonebookEditMode && (
                <td className="px-1 py-3 text-center first:rounded-r-[1.5rem] w-8">
                    <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing text-slate-300 hover:text-amber-700 p-1 outline-none"><GripVertical size={18} /></div>
                </td>
            )}

            {/* רינדור עמודות השורה */}
            {phonebookSchema.filter((col: any) => isPhonebookEditMode || col.key !== 'birthday').map((col: any) => (
                <td key={col.key} className={`px-2 py-3 2xl:py-5 truncate ${!isPhonebookEditMode && 'first:rounded-r-[1.5rem]'} last:rounded-l-[1.5rem]`}>
                    {isPhonebookEditMode ? (
                        <input
                            value={row[col.key] || ''}
                            onChange={e => updatePhonebookCell(row.id, col.key, e.target.value)}
                            className="w-full min-w-0 bg-slate-50 border border-slate-100 rounded-lg 2xl:rounded-xl p-2 2xl:p-3 text-xs 2xl:text-base focus:bg-white focus:ring-2 focus:ring-amber-100 outline-none font-bold text-slate-800 transition-all"
                            placeholder={col.label}
                        />
                    ) : (
                        <span className="text-sm 2xl:text-lg font-bold text-slate-700 group-hover:text-white transition-colors duration-300 block truncate">
                            {row[col.key] || '---'}
                        </span>
                    )}
                </td>
            ))}

            {/* כפתור מחיקת שורה */}
            {isPhonebookEditMode && (
                <td className="px-2 py-3 text-left rounded-l-[1.5rem] w-12">
                    <button onClick={() => deletePhonebookRow(row.id)} className="bg-red-50 text-red-500 hover:bg-white p-2 rounded-lg transition-all shadow-sm cursor-pointer"><Trash2 size={18} /></button>
                </td>
            )}
        </tr>
    );
}

// רכיב: שדה הניתן לגרירה (משמש במודל עריכת סכמת קטגוריה)
function SortableField({ field, idx, updateFieldInSchema, removeFieldFromSchema }: any) {
    const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: field.key });
    const style = { transform: CSS.Transform.toString(transform), transition };

    return (
        <div ref={setNodeRef} style={style} className="flex gap-4 items-center bg-white p-4 rounded-2xl shadow-sm border border-slate-200 group">
            {/* ידית גרירה */}
            <div {...attributes} {...listeners} className="cursor-grab text-slate-400 hover:text-slate-600 active:cursor-grabbing p-1 outline-none">
                <GripVertical size={20} />
            </div>

            <div className="bg-slate-100 w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-slate-500 shrink-0">{idx + 1}</div>

            <input
                className="flex-1 outline-none font-bold text-slate-700 text-lg bg-transparent"
                placeholder="שם השדה"
                value={field.label}
                onChange={e => updateFieldInSchema(field.key, 'label', e.target.value)}
            />

            <div className="h-8 w-px bg-slate-200 mx-2"></div>

            <select
                className="bg-transparent text-base p-2 outline-none font-medium text-slate-600 cursor-pointer"
                value={field.type}
                onChange={e => updateFieldInSchema(field.key, 'type', e.target.value)}
            >
                <option value="text">🔤 טקסט קצר</option>
                <option value="textarea">📄 טקסט ארוך</option>
                <option value="link">🔗 קישור (URL)</option>
                <option value="password">🔑 שם משתמש וסיסמה</option>
                <option value="file">📁 קבצים (מרובה)</option>
                <option value="folder">תיקיית רשת / כונן</option>
            </select>

            <button onClick={() => removeFieldFromSchema(field.key)} className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity p-2 rounded-full hover:bg-red-50 cursor-pointer">
                <Trash2 size={20} />
            </button>
        </div>
    );
}


// ==================== הקומפוננטה הראשית (MAIN COMPONENT) ====================
export default function DynamicIPIDashboard({ initialUser }: any) {

    // ==================== הרשאות ובסיס (PERMISSIONS) ====================
    // רשימת המורשים לעריכה (Admins)
    const authorizedAdmins = ['itayc', 'gal', 'michaelg'].map(u => u.toLowerCase());

    // מעקף סביבת פיתוח: מזהה אם אנחנו רצים מקומית ונותן הרשאות אוטומטית
    const isUserAdmin = process.env.NODE_ENV === 'development'
        ? true
        : (initialUser?.username
            ? authorizedAdmins.includes(initialUser.username.toLowerCase())
            : false);

    // חישוב התאריך של היום להצגה דינמית
    const today = new Date();
    const todayFormatted = `${today.getDate().toString().padStart(2, '0')}/${(today.getMonth() + 1).toString().padStart(2, '0')}/${today.getFullYear()}`;


    // ==================== ניהול מצב (STATE) ====================

    // --- סטייט מערכת כללי ---
    const [sections, setSections] = useState<any[]>([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [isEditMode, setIsEditMode] = useState(false);
    const [showLoginModal, setShowLoginModal] = useState(false);
    const [loginCredentials, setLoginCredentials] = useState({ username: '', password: '' });
    const [showHolidayDecor, setShowHolidayDecor] = useState(false);
    const [memorialDayType, setMemorialDayType] = useState<MemorialType>(null);

    // --- סטייט קטגוריות (Section Builder) ---
    const [showCreateSectionModal, setShowCreateSectionModal] = useState(false);
    const [newSectionTitle, setNewSectionTitle] = useState("");
    const [newSectionFields, setNewSectionFields] = useState<{ key: string, label: string, type: string }[]>([]);
    const [editingSectionId, setEditingSectionId] = useState<number | null>(null);

    // --- סטייט יצירת/עריכת פריט (Dynamic Form) ---
    const [showAddItemModal, setShowAddItemModal] = useState(false);
    const [targetSection, setTargetSection] = useState<any>(null);
    const [newItemData, setNewItemData] = useState<any>({});
    const [editingItemId, setEditingItemId] = useState<number | null>(null);
    const [newItemVisibility, setNewItemVisibility] = useState<string[]>(['הכל']);

    // --- סטייט צפייה בפריט קיים ---
    const [viewItem, setViewItem] = useState<{ item: any, section: any } | null>(null);

    // --- סטייט הודעות מערכת רצות ---
    const [systemMessages, setSystemMessages] = useState<{ id: string, text: string, date: string }[]>([]);
    const [currentMsgIndex, setCurrentMsgIndex] = useState(0);
    const [newMsgText, setNewMsgText] = useState("");
    const [isHovered, setIsHovered] = useState(false);

    // --- סטייט ספר טלפונים ---
    const [phonebookData, setPhonebookData] = useState<any[]>([]);
    const [draftPhonebook, setDraftPhonebook] = useState<any[]>([]);
    const [isPhonebookEditMode, setIsPhonebookEditMode] = useState(false);
    const [selectedDept, setSelectedDept] = useState<string>('הכל');
    const [columnToDelete, setColumnToDelete] = useState<string | null>(null);
    const [phonebookSchema, setPhonebookSchema] = useState<{ key: string, label: string, width?: string }[]>([
        { key: 'name', label: 'שם העובד', width: 'w-[15%]' },
        { key: 'department', label: 'מחלקה', width: 'w-[15%]' },
        { key: 'role', label: 'תפקיד', width: 'w-[15%]' },
        { key: 'phone', label: 'טלפון', width: 'w-[15%]' },
        { key: 'email', label: 'מייל', width: 'w-[25%]' },
        { key: 'ext', label: 'שלוחה', width: 'w-[10%]' },
        { key: 'birthday', label: 'יום הולדת', width: 'w-[15%]' },
    ]);

    // --- סטייט אבטחה, סיסמאות והעתקות ---
    const [copiedField, setCopiedField] = useState<string | null>(null);
    const [visiblePasswords, setVisiblePasswords] = useState<Record<string, boolean>>({});
    const [showSecurityModal, setShowSecurityModal] = useState(false);
    const [securityInput, setSecurityInput] = useState("");
    const [pendingAction, setPendingAction] = useState<{ type: 'toggle' | 'copy', key: string, value: string } | null>(null);
    const [unlockedPasswords, setUnlockedPasswords] = useState<Record<string, number>>({});

    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [isAuthenticated, setIsAuthenticated] = useState(false);

    // ==================== רפרנסים וחיישנים (REFS & SENSORS) ====================
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    // חיישני גרירה (DND)
    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );


    // ==================== אפקטים (USE EFFECTS) ====================

    // הוספנו את isEditMode ו-initialUser כדי שהמערכת תרענן את המידע כשהם משתנים
    useEffect(() => {
        fetchSections();
    }, [isEditMode, initialUser]);

    const fetchSections = async () => {
        try {
            // 1. אוספים את "תעודת הזהות" המלאה של המשתמש המחובר
            const userDept = initialUser?.department || '';
            const userName = initialUser?.username || '';
            const userTitle = initialUser?.title || '';

            // התוספת שלנו: אורזים את הקבוצות כטקסט כדי שיעברו ב-URL
            const userGroups = initialUser?.groups ? JSON.stringify(initialUser.groups) : '[]';

            const editModeParam = isEditMode ? 'true' : 'false';

            // 2. בונים את הכתובת עם כל הפרמטרים
            const urlParams = new URLSearchParams({
                department: userDept,
                username: userName,
                title: userTitle,
                groups: userGroups, // <--- הוספנו את הקבוצות לכאן!
                editMode: editModeParam
            });

            // 3. שולחים את הבקשה החכמה לשרת המאובטח שלנו (GET)
            const res = await fetch(`/api/sections?${urlParams.toString()}`);

            if (res.ok) setSections(await res.json());
        } catch (e) {
            console.error("שגיאה במשיכת הנתונים המאובטחים:", e);
        }
    };

    // טעינה ראשונית: הודעות מערכת
    useEffect(() => {
        const loadMessages = async () => {
            try {
                const timestamp = new Date().getTime();
                const res = await fetch(`/api/messages?t=${timestamp}`, {
                    cache: 'no-store',
                    headers: { 'Pragma': 'no-cache', 'Cache-Control': 'no-cache' }
                });
                const json = await res.json();
                if (json.data) setSystemMessages(json.data);
            } catch (error) { console.error("שגיאה בטעינת הודעות:", error); }
        };
        loadMessages();
    }, []);

    // טעינה ראשונית: ספר טלפונים
    useEffect(() => {
        const loadPhonebook = async () => {
            try {
                const res = await fetch('/api/phonebook');
                const json = await res.json();

                if (json.data && Array.isArray(json.data)) {
                    // ניקוי נתונים: כפיית טקסט על כל שדה למניעת קריסות
                    const sanitizedData = json.data.map((row: any) => ({
                        ...row,
                        birthday: String(row.birthday || '').trim(),
                        name: String(row.name || '').trim(),
                        role: String(row.role || '').trim(),
                        phone: String(row.phone || '').trim(),
                        email: String(row.email || '').trim(),
                        ext: String(row.ext || '').trim()
                    }));

                    setPhonebookData(sanitizedData);

                    // הגדרת טאב מחלקה לפי המשתמש הנוכחי
                    const userDept = initialUser?.department;
                    if (userDept && userDept !== 'כללי') {
                        const existingDepts = Array.from(new Set(sanitizedData.map((row: any) => row.department).filter(Boolean)));
                        if (existingDepts.includes(userDept)) {
                            setSelectedDept(userDept);
                        }
                    }
                }
            } catch (error) { console.error("שגיאה בטעינת ספר טלפונים:", error); }
        };
        loadPhonebook();
    }, [initialUser]);

    // ניהול חכם של מעבר טאבים לפי חיפוש ומצב עריכה
    useEffect(() => {
        if (isPhonebookEditMode) {
            setSelectedDept('הכל');
            return;
        }
        if (searchTerm.trim() !== '') {
            setSelectedDept('הכל');
            return;
        }
        const userDept = initialUser?.department;
        if (phonebookData && userDept && userDept !== 'כללי') {
            const existingDepts = Array.from(new Set(phonebookData.map((row: any) => row?.department).filter(Boolean)));
            if (existingDepts.includes(userDept)) {
                setSelectedDept(userDept);
                return;
            }
        }
        setSelectedDept('הכל');
    }, [searchTerm, phonebookData, initialUser, isPhonebookEditMode]);

    // טיימר החלפת הודעות מערכת רצות
    useEffect(() => {
        if (systemMessages.length <= 1 || isHovered) return;
        const timer = setInterval(() => {
            setCurrentMsgIndex((prev) => (prev + 1) % systemMessages.length);
        }, 2000);
        return () => clearInterval(timer);
    }, [systemMessages.length, isHovered]);

    // הקפאת גלילת רקע כאשר מודל כלשהו פתוח
    useEffect(() => {
        const isAnyModalOpen = showCreateSectionModal || showAddItemModal || viewItem || showSecurityModal;
        if (isAnyModalOpen) document.body.style.overflow = 'hidden';
        else document.body.style.overflow = 'unset';
        return () => { document.body.style.overflow = 'unset'; };
    }, [showCreateSectionModal, showAddItemModal, viewItem, showSecurityModal]);

    // סנכרון אוטומטי: כשנכנסים/יוצאים ממצב עריכת פורטל, סנכרן את מצב ספר הטלפונים
    useEffect(() => {
        if (isEditMode) {
            // מעתיק את הנתונים לטיוטה בדיוק כמו שהכפתור היה עושה
            setDraftPhonebook([...phonebookData]);
            setIsPhonebookEditMode(true);
        } else {
            // כשיוצאים מעריכת הפורטל, סגור גם את עריכת הטבלה
            setIsPhonebookEditMode(false);
        }
    }, [isEditMode]);

    // ==================== פונקציות: סכמות וקטגוריות ====================
    const addFieldToSchema = () => {
        const key = `f_${Date.now()}`;
        setNewSectionFields([...newSectionFields, { key, label: '', type: 'text' }]);
    };

    const removeFieldFromSchema = (keyToRemove: string) => {
        setNewSectionFields(fields => fields.filter(f => f.key !== keyToRemove));
    };

    const updateFieldInSchema = (keyToUpdate: string, fieldName: string, value: string) => {
        setNewSectionFields(fields => fields.map(f =>
            f.key === keyToUpdate ? { ...f, [fieldName]: value } : f
        ));
    };

    const handleSaveSection = async () => {
        if (!newSectionTitle || newSectionFields.length === 0) { alert("חובה לתת שם ולהוסיף שדות"); return; }
        const action = editingSectionId ? 'update_section' : 'create_section';
        await fetch('/api/sections', {
            method: 'POST',
            body: JSON.stringify({ action, id: editingSectionId, title: newSectionTitle, schema: newSectionFields })
        });
        await fetchSections();
        setShowCreateSectionModal(false);
        setNewSectionTitle(""); setNewSectionFields([]); setEditingSectionId(null);
    };

    const openEditSectionModal = (section: any) => {
        setNewSectionTitle(section.title);
        setNewSectionFields([...section.schema]);
        setEditingSectionId(section.id);
        setShowCreateSectionModal(true);
    };

    const handleDeleteSection = async (id: number) => {
        if (!confirm('למחוק את כל הקטגוריה?')) return;
        await fetch('/api/sections', { method: 'POST', body: JSON.stringify({ action: 'delete_section', id }) });
        await fetchSections();
    };


    // ==================== פונקציות: פריטים (מוצרים/נהלים) ====================
    const handleSaveItem = async () => {
        const action = editingItemId ? 'update_item' : 'add_item';
        const dataToSend: Record<string, any> = {};

        targetSection.schema.forEach((field: any) => {
            const value = newItemData[field.key];
            dataToSend[field.key] = (value !== undefined && value !== null) ? value : "";
        });

        // 1. הופכים את מערך הצ'קבוקסים לטקסט שיישמר בשרת
        const visibilityString = newItemVisibility.includes('הכל') ? 'הכל' : newItemVisibility.join(',');

        await fetch('/api/sections', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action,
                sectionId: targetSection.id,
                itemId: editingItemId,
                data: dataToSend,
                visibility: visibilityString // 2. שולחים את ההרשאות ל-SQL!
            })
        });

        await fetchSections();
        setShowAddItemModal(false);
        setNewItemData({});
        setEditingItemId(null);
        setNewItemVisibility(['הכל']); // איפוס
    };

    const openEditItemModal = (section: any, item: any) => {
        setTargetSection(section);
        setNewItemData({ ...item.data });
        setEditingItemId(item.id);

        // 3. כשפותחים פריט לעריכה - קוראים את ההרשאות שלו
        if (item.visibility && item.visibility !== 'הכל' && item.visibility.trim() !== '') {
            setNewItemVisibility(item.visibility.split(',').map((s: string) => s.trim()));
        } else {
            setNewItemVisibility(['הכל']);
        }

        setShowAddItemModal(true);
    };

    const handleDeleteItem = async (sectionId: number, itemId: number) => {
        if (!confirm('למחוק פריט זה?')) return;
        await fetch('/api/sections', { method: 'POST', body: JSON.stringify({ action: 'delete_item', sectionId, itemId }) });
        await fetchSections();
        if (viewItem?.item.id === itemId) setViewItem(null);
    };


    // ==================== פונקציות: ניהול קבצים ====================
    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>, fieldKey: string) => {
        const files = e.target.files;
        if (files && files.length > 0) {
            const fileReaders: Promise<any>[] = [];
            Array.from(files).forEach(file => {
                const reader = new FileReader();
                const promise = new Promise((resolve) => {
                    reader.onloadend = () => resolve({ name: file.name, content: reader.result });
                });
                reader.readAsDataURL(file);
                fileReaders.push(promise);
            });

            const newFiles = await Promise.all(fileReaders);
            setNewItemData((prev: any) => {
                const existingFiles = prev[fieldKey] || [];
                return { ...prev, [fieldKey]: [...existingFiles, ...newFiles] };
            });
        }
        e.target.value = "";
    };

    const handleRemoveFile = (fieldKey: string, indexToRemove: number) => {
        setNewItemData((prev: any) => {
            const currentFiles = prev[fieldKey] || [];
            return { ...prev, [fieldKey]: currentFiles.filter((_: any, idx: number) => idx !== indexToRemove) };
        });
    };


    // ==================== פונקציות: מערכת הודעות ====================
    const addSystemMessage = async () => {
        if (!newMsgText.trim()) return;
        const newMsg = { id: Date.now().toString(), text: newMsgText, date: todayFormatted };
        setSystemMessages([...systemMessages, newMsg]);
        setNewMsgText("");

        try {
            await fetch('/api/messages', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'add', message: newMsg })
            });
        } catch (error) { console.error("שגיאה בשליחה לשרת:", error); }
    };

    const removeSystemMessage = async (id: string) => {
        setSystemMessages(systemMessages.filter(msg => msg.id !== id));
        setCurrentMsgIndex(0);

        try {
            await fetch('/api/messages', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'delete', id })
            });
        } catch (error) { console.error("שגיאה במחיקה:", error); }
    };


    // ==================== פונקציות: ספר טלפונים ואקסל ====================
    const savePhonebookData = async (newData: any) => {
        setPhonebookData(newData);
        await fetch('/api/phonebook', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json' // <--- שורת הקסם שחסרה!
            },
            body: JSON.stringify({ type: 'data', payload: newData })
        });
    };

    const savePhonebookSchema = async (newSchema: any) => {
        setPhonebookSchema(newSchema);
        await fetch('/api/phonebook', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json' // <--- וגם כאן!
            },
            body: JSON.stringify({ type: 'schema', payload: newSchema })
        });
    };

    const addColumn = () => savePhonebookSchema([...phonebookSchema, { key: `col_${Date.now()}`, label: "" }]);
    const removeColumn = (keyToRemove: string) => savePhonebookSchema(phonebookSchema.filter(col => col.key !== keyToRemove));
    const updateColumnTitle = (key: string, newTitle: string) => savePhonebookSchema(phonebookSchema.map(col => col.key === key ? { ...col, label: newTitle } : col));

    const addPhonebookRow = () => {
        const newRow: any = { id: Date.now().toString() };
        phonebookSchema.forEach((col: any) => newRow[col.key] = "");

        // מעדכנים *רק* את הטיוטה. המסך יתעדכן מיד!
        setDraftPhonebook(prevDraft => [...prevDraft, newRow]);
    };

    const deletePhonebookRow = (id: number | string) => {
        const idAsString = String(id);

        // מוחקים *רק* מהטיוטה. השורה תעלם מהמסך בשנייה.
        setDraftPhonebook(prevDraft => prevDraft.filter(row => String(row.id) !== idAsString));
    };

    const updatePhonebookCell = (id: number | string, field: string, value: string) => {
        const idAsString = String(id);

        // מעדכנים *רק* את הטיוטה.
        setDraftPhonebook(prevDraft => prevDraft.map(row =>
            String(row.id) === idAsString ? { ...row, [field]: value } : row
        ));
    };

    const handleExcelUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const data = new Uint8Array(event.target?.result as ArrayBuffer);
                const workbook = XLSX.read(data, { type: 'array' });
                const worksheet = workbook.Sheets[workbook.SheetNames[0]];
                const jsonData = XLSX.utils.sheet_to_json(worksheet, { raw: false, defval: '' });

                const getValue = (row: any, possibleKeys: string[]) => {
                    const actualKey = Object.keys(row).find(key => possibleKeys.includes(key.trim()));
                    return actualKey ? String(row[actualKey] || '').trim() : '';
                };

                const rawRows = jsonData.map((row: any) => ({
                    id: Math.random().toString(36).substring(2, 15) + Date.now().toString(36),
                    name: getValue(row, ['שם העובד', 'שם', 'Name']),
                    department: getValue(row, ['מחלקה', 'department']),
                    role: getValue(row, ['תפקיד', 'Role']),
                    phone: getValue(row, ['טלפון', 'Phone']),
                    email: getValue(row, ['מייל', 'Email']),
                    ext: getValue(row, ['שלוחה', 'Ext']),
                    birthday: getValue(row, ['יום הולדת', 'תאריך לידה'])
                }));

                const validRows = rawRows.filter(row => row.name.replace(/[0-9]/g, '').trim().length >= 2);

                if (validRows.length === 0) { alert("לא נמצאו נתוני עובדים תקינים בקובץ."); return; }
                if (!confirm(`נמצאו ${validRows.length} עובדים תקינים. האם להחליף את ספר הטלפונים? (סוננו ${rawRows.length - validRows.length} שורות פגומות)`)) {
                    e.target.value = ''; return;
                }

                // --- הנה שורת הקסם שחסרה! ---
                setDraftPhonebook(validRows); // הזרקה של נתוני האקסל ישר לטיוטה כדי שהמסך יתעדכן מיד!

                savePhonebookData(validRows);
                alert("הנתונים עודכנו בהצלחה!");
            } catch (error) { console.error("Excel Error:", error); alert("חלה שגיאה בעיבוד הקובץ."); }
        };
        reader.readAsArrayBuffer(file);
        e.target.value = '';
    };
    const downloadExcelTemplate = () => {
        const headers = [{
            'שם העובד': 'ישראל ישראלי', 'מחלקה': 'מכירות', 'תפקיד': 'מנהל',
            'טלפון': '050-1234567', 'מייל': 'test@ipi.co.il', 'שלוחה': '101', 'יום הולדת': '23.02.2026'
        }];
        const worksheet = XLSX.utils.json_to_sheet(headers);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "תבנית");
        XLSX.writeFile(workbook, "Phonebook_Template_V1.8.xlsx");
    };


    // ==================== פונקציות: אבטחה והתחברות ====================
    // ==================== פונקציות: אבטחה והתחברות (מעודכן ל-DB) ====================
    const handleLogin = async (e?: React.FormEvent) => {
        if (e && e.preventDefault) e.preventDefault();

        setIsLoading(true);
        setError('');

        try {
            // שולחים את השם והסיסמה שהמשתמש הקליד בתיבות הקיימות ל-API החדש
            const response = await fetch('/api/auth', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    username: loginCredentials.username,
                    password: loginCredentials.password
                }),
            });

            const data = await response.json();

            // בודקים את התשובה מה-DB (שעכשיו חוזרת עם סטטוס 200)
            if (data.isAuthorized === true) {
                // הצלחה!
                setIsAuthenticated(true);
                setIsEditMode(true);
                setShowLoginModal(false);
                setLoginCredentials({ username: '', password: '' });
            } else {
                // נכשל - מציגים את השגיאה מה-DB (למשל "סיסמה שגויה")
                const errorMsg = data.message || 'פרטי התחברות שגויים.';
                setError(errorMsg);
                alert(errorMsg);
            }
        } catch (err) {
            setError('שגיאת תקשורת מול השרת.');
            alert('שגיאת תקשורת מול השרת.');
        } finally {
            setIsLoading(false);
        }
    };
    const copyToClipboard = (text: string, id: string) => {
        navigator.clipboard.writeText(text);
        setCopiedField(id);
        setTimeout(() => setCopiedField(null), 2000);
    };

    const handlePasswordAction = (type: 'toggle' | 'copy', key: string, value: string) => {
        if (type === 'toggle' && visiblePasswords[key]) {
            setVisiblePasswords(prev => ({ ...prev, [key]: false })); return;
        }
        if (unlockedPasswords[key] > 0) {
            if (type === 'toggle') setVisiblePasswords(prev => ({ ...prev, [key]: true }));
            else copyToClipboard(value, key);
            return;
        }
        setPendingAction({ type, key, value });
        setSecurityInput("");
        setShowSecurityModal(true);
    };

    const handleSecurityVerify = (e: React.FormEvent) => {
        e.preventDefault();
        if (securityInput === '123456') {
            const key = pendingAction!.key;
            let timeLeft = 10;
            setUnlockedPasswords(prev => ({ ...prev, [key]: timeLeft }));

            const timer = setInterval(() => {
                timeLeft -= 1;
                setUnlockedPasswords(prev => ({ ...prev, [key]: timeLeft }));
                if (timeLeft <= 0) {
                    clearInterval(timer);
                    setVisiblePasswords(prev => ({ ...prev, [key]: false }));
                }
            }, 1000);

            if (pendingAction?.type === 'toggle') setVisiblePasswords(prev => ({ ...prev, [key]: true }));
            else if (pendingAction?.type === 'copy') copyToClipboard(pendingAction.value, key);

            setShowSecurityModal(false); setPendingAction(null);
        } else alert("סיסמה שגויה!");
    };


    // ==================== פונקציות: ימי הולדת ====================
    const getBirthdayCelebrants = () => {
        const currentMonth = today.getMonth() + 1;
        const currentDay = today.getDate();

        return phonebookData.filter(row => {
            if (!row.birthday) return false;
            const parts = row.birthday.split(/[\.\/]/);
            if (parts.length < 2) return false;
            return parseInt(parts[1]) === currentMonth;
        }).map(row => {
            const parts = row.birthday.split(/[\.\/]/);
            const day = parseInt(parts[0]);
            return { ...row, isToday: day === currentDay, day };
        }).sort((a, b) => {
            if (a.isToday && !b.isToday) return -1;
            if (!a.isToday && b.isToday) return 1;
            return a.day - b.day;
        });
    };
    const birthdayCelebrants = getBirthdayCelebrants();


    // ==================== פונקציות: DND (גרירה ושחרור) ====================
    const handleDragEnd = (event: any) => {
        const { active, over } = event;
        if (active.id !== over.id) {
            setNewSectionFields((items) => {
                const oldIndex = items.findIndex((item) => item.key === active.id);
                const newIndex = items.findIndex((item) => item.key === over.id);
                return arrayMove(items, oldIndex, newIndex);
            });
        }
    };

    const handlePhonebookDragEnd = (event: any) => {
        const { active, over } = event;
        if (!over) return;
        if (String(active.id) !== String(over.id)) {
            const oldIndex = phonebookData.findIndex((row) => String(row.id) === String(active.id));
            const newIndex = phonebookData.findIndex((row) => String(row.id) === String(over.id));
            if (oldIndex !== -1 && newIndex !== -1) {
                const newData = arrayMove(phonebookData, oldIndex, newIndex);
                savePhonebookData(newData);
            }
        }
    };


    // ==================== פונקציות: עיצוב וערכות נושא ====================
    const getColorClasses = (color: string) => {
        const map: any = {
            red: { bg: 'bg-red-500', light: 'bg-red-50', text: 'text-red-600', border: 'border-red-200' },
            blue: { bg: 'bg-blue-500', light: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-200' },
            green: { bg: 'bg-green-500', light: 'bg-green-50', text: 'text-green-600', border: 'border-green-200' },
            purple: { bg: 'bg-purple-500', light: 'bg-purple-50', text: 'text-purple-600', border: 'border-purple-200' },
            orange: { bg: 'bg-orange-500', light: 'bg-orange-50', text: 'text-orange-600', border: 'border-orange-200' },
            teal: { bg: 'bg-teal-500', light: 'bg-teal-50', text: 'text-teal-600', border: 'border-teal-200' },
            indigo: { bg: 'bg-indigo-500', light: 'bg-indigo-50', text: 'text-indigo-600', border: 'border-indigo-200' },
            pink: { bg: 'bg-pink-500', light: 'bg-pink-50', text: 'text-pink-600', border: 'border-pink-200' },
        };
        return map[color] || map['red'];
    };

    const getCardGradientTheme = (color: string) => {
        const themes: any = {
            red: { border: 'border-red-200', shadow: 'shadow-red-100', hoverShadow: 'hover:shadow-red-500/40', gradientFrom: 'hover:from-red-500', gradientTo: 'hover:to-red-600', iconColor: 'text-red-50' },
            blue: { border: 'border-blue-200', shadow: 'shadow-blue-100', hoverShadow: 'hover:shadow-blue-500/40', gradientFrom: 'hover:from-blue-500', gradientTo: 'hover:to-blue-600', iconColor: 'text-blue-50' },
            green: { border: 'border-green-200', shadow: 'shadow-green-100', hoverShadow: 'hover:shadow-green-500/40', gradientFrom: 'hover:from-green-500', gradientTo: 'hover:to-green-600', iconColor: 'text-green-50' },
            purple: { border: 'border-purple-200', shadow: 'shadow-purple-100', hoverShadow: 'hover:shadow-purple-500/40', gradientFrom: 'hover:from-purple-500', gradientTo: 'hover:to-purple-600', iconColor: 'text-purple-50' },
            orange: { border: 'border-orange-200', shadow: 'shadow-orange-100', hoverShadow: 'hover:shadow-orange-500/40', gradientFrom: 'hover:from-orange-500', gradientTo: 'hover:to-orange-600', iconColor: 'text-orange-50' },
            teal: { border: 'border-teal-200', shadow: 'shadow-teal-100', hoverShadow: 'hover:shadow-teal-500/40', gradientFrom: 'hover:from-teal-500', gradientTo: 'hover:to-teal-600', iconColor: 'text-teal-50' },
            indigo: { border: 'border-indigo-200', shadow: 'shadow-indigo-100', hoverShadow: 'hover:shadow-indigo-500/40', gradientFrom: 'hover:from-indigo-500', gradientTo: 'hover:to-indigo-600', iconColor: 'text-indigo-50' },
            pink: { border: 'border-pink-200', shadow: 'shadow-pink-100', hoverShadow: 'hover:shadow-pink-500/40', gradientFrom: 'hover:from-pink-500', gradientTo: 'hover:to-pink-600', iconColor: 'text-pink-50' },
        };
        return themes[color] || themes['red'];
    };

    // רכיב פנימי: חוגגי ימי הולדת
    const BirthdayTicker = () => {
        if (birthdayCelebrants.length === 0) return null;
        return (
            <div className="absolute left-4 xl:left-6 2xl:left-8 top-0 z-10 w-60 2xl:w-72 hidden lg:block animate-in fade-in slide-in-from-left-10 duration-1000 origin-top-left">
                <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl border border-pink-100 overflow-hidden relative">
                    <div className="bg-gradient-to-r from-pink-500 to-rose-400 p-3 2xl:p-4 text-center relative z-20 shadow-md">
                        <h3 className="text-white font-black text-lg 2xl:text-xl flex justify-center items-center gap-2">
                            <Gift size={20} className="animate-bounce 2xl:w-6 2xl:h-6" /> חוגגים החודש!
                        </h3>
                    </div>
                    <div className="p-3 2xl:p-4 space-y-2 2xl:space-y-3 max-h-[240px] 2xl:max-h-[290px] overflow-y-auto">
                        {birthdayCelebrants.map((person, idx) => (
                            <div key={idx} className={`relative p-2 2xl:p-3 rounded-2xl border transition-all duration-500 ${person.isToday ? 'bg-gradient-to-br from-yellow-50 to-amber-50 border-amber-300 shadow-md scale-105' : 'bg-white border-slate-100'}`}>
                                <div className="flex justify-between items-center">
                                    <div>
                                        <p className={`font-bold ${person.isToday ? 'text-amber-700 text-base 2xl:text-lg' : 'text-slate-700 text-sm 2xl:text-base'}`}>{person.name}</p>
                                        <p className="text-xs 2xl:text-sm text-slate-500 font-mono font-medium mt-0.5 flex items-center gap-1">📅 {person.birthday}</p>
                                    </div>
                                    {person.isToday ? <span className="text-2xl 2xl:text-3xl animate-pulse">🎂</span> : <span className="text-xl 2xl:text-2xl opacity-60">🎈</span>}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        );
    };

    // ==================== רינדור המסך (RENDER / JSX) ====================
    return (
        <div className="font-sans min-h-screen relative bg-slate-50 text-slate-900" dir="rtl">

            {/* ==================== אזור כותרת עליונה (HEADER) ==================== */}
            <header className="max-w-7xl mx-auto px-4 2xl:px-6 py-4 2xl:py-10 flex justify-between items-center relative">

                <IndependenceDayDecor isVisible={showHolidayDecor} />
                {/* באנר ימי זיכרון שחור */}
                <MemorialDayBanner type={memorialDayType} />

                {/* צד ימין: לוגו החברה וקישור לאתר */}
                <div className="flex items-center gap-4 w-48">
                    <a
                        href="https://www.ipi.co.il"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="relative w-20 h-20 2xl:w-24 2xl:h-24 group cursor-pointer block transition-transform duration-300 hover:scale-105 active:scale-95"
                        title="מעבר לאתר IPI"
                    >
                        <img src="/logo-red.png" alt="IPI Logo" className="absolute inset-0 w-full h-full object-contain transition-opacity duration-300 opacity-100 group-hover:opacity-0" />
                        <img src="/logo-blue.png" alt="IPI Logo Hover" className="absolute inset-0 w-full h-full object-contain transition-opacity duration-300 opacity-0 group-hover:opacity-100" />
                    </a>
                    <div className="flex flex-col text-right">
                        <h1 className="text-3xl 2xl:text-4xl font-black text-red-600 leading-none tracking-tight">פורטל</h1>
                        <span className="text-base 2xl:text-lg text-red-600 font-medium tracking-wide">IPI Portal</span>
                    </div>
                </div>

                {/* אמצע: פרטי המשתמש הנוכחי (שם, מחלקה, IP ומחשב) */}
                <div className="absolute top-2 2xl:top-4 left-1/2 -translate-x-1/2 text-center font-medium tracking-wide flex flex-col items-center">
                    <div className="text-slate-400 text-lg 2xl:text-xl">
                        <span>{initialUser?.displayName || initialUser?.username || 'אורח'}</span>
                        <span className="mx-3 text-slate-200">|</span>
                        <span>{initialUser?.department || 'כללי'}</span>
                    </div>
                    <div className="flex items-center justify-center text-slate-500 text-sm 2xl:text-base mt-1 2xl:mt-1.5">
                        <span dir="ltr" className="font-mono text-xs 2xl:text-sm mt-0.5">{initialUser?.computerName || 'N/A'}</span>
                        <span className="mx-2 2xl:mx-3 text-slate-400">|</span>
                        <span>{initialUser?.username || 'לא ידוע'}</span>
                        <span className="mx-2 2xl:mx-3 text-slate-400">|</span>
                        <span dir="ltr" className="font-mono text-xs 2xl:text-sm mt-0.5">{initialUser?.ipAddress || 'לא זמין'}</span>
                    </div>
                </div>

                {/* צד שמאל: כפתור טוגל עריכה (מוצג רק למנהלים מורשים) */}
                {isUserAdmin && (
                    <div className="w-48 flex justify-end">
                        <button
                            onClick={() => {
                                if (isEditMode) {
                                    setIsEditMode(false);
                                    setIsPhonebookEditMode(false);
                                } else {
                                    setShowLoginModal(true); // דורש סיסמה לכניסה למצב עריכה
                                }
                            }}
                            className={`flex items-center gap-2 2xl:gap-3 px-4 2xl:px-6 py-2 2xl:py-3 rounded-full font-bold text-sm 2xl:text-base cursor-pointer transition-all border shadow-sm 
                ${isEditMode
                                    ? 'bg-red-50 text-red-600 border-red-200 hover:bg-red-100 hover:border-red-300 hover:text-red-700'
                                    : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50 hover:text-slate-700 hover:border-slate-300'
                                }`}
                        >
                            {isEditMode ? <Unlock size={18} className="2xl:w-5 2xl:h-5" /> : <Lock size={18} className="2xl:w-5 2xl:h-5" />}
                            {isEditMode ? 'עריכה פעילה' : 'צפייה'}
                        </button>
                    </div>
                )}
            </header>


            {/* ==================== תוכן מרכזי (MAIN CONTENT) ==================== */}
            <main className="w-full max-w-[1800px] mx-auto px-4 lg:px-6 pb-32">

                {/* --- הגדרות פורטל כלליות (מוצג רק בעריכה) --- */}
                {/* --- אזור 1: הודעות מערכת רצות (System Messages) --- */}
                {(!isEditMode && systemMessages.length === 0) ? null : (
                    <section className="mb-12 2xl:mb-16 max-w-3xl xl:max-w-4xl 2xl:max-w-5xl mx-auto relative z-10 px-4">

                        {/* תצוגת ההודעות בפועל */}
                        {systemMessages.length > 0 && (
                            <div
                                className="bg-gradient-to-r from-red-600 to-red-500 rounded-[2rem] p-6 2xl:p-10 relative shadow-xl shadow-red-500/20 overflow-hidden flex items-center justify-center min-h-[120px] 2xl:min-h-[160px] border-4 border-white/20 cursor-pointer group"
                                onMouseEnter={() => setIsHovered(true)}
                                onMouseLeave={() => setIsHovered(false)}
                                onClick={() => { if (systemMessages.length > 1) setCurrentMsgIndex((prev) => (prev + 1) % systemMessages.length); }}
                            >
                                <div className="absolute top-4 right-6 text-red-100 font-bold font-mono text-xs 2xl:text-sm bg-black/10 px-3 py-1 rounded-full z-20">
                                    {todayFormatted}
                                </div>
                                <AnimatePresence mode="wait">
                                    <motion.div
                                        key={systemMessages[currentMsgIndex]?.id}
                                        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.5 }}
                                        className="text-xl xl:text-2xl 2xl:text-3xl font-black text-white text-center px-8"
                                    >
                                        {systemMessages[currentMsgIndex]?.text}
                                    </motion.div>
                                </AnimatePresence>
                                {systemMessages.length > 1 && (
                                    <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-2 z-20">
                                        {systemMessages.map((_, idx) => (
                                            <div key={idx} className={`h-1.5 rounded-full transition-all duration-500 ${idx === currentMsgIndex ? 'w-8 bg-white' : 'w-2 bg-white/40'}`} />
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* ממשק ניהול הודעות (מוצג רק בעריכה) */}
                        {isEditMode && (
                            <div className="mt-4 bg-white p-6 2xl:p-8 rounded-[2rem] border-2 border-red-100 shadow-sm relative z-20">
                                <h3 className="font-bold text-red-600 mb-4 text-lg">ניהול הודעות מערכת רצות</h3>
                                <div className="flex gap-4 mb-6">
                                    <input
                                        className="flex-1 bg-slate-50 border border-slate-200 rounded-2xl p-4 outline-none focus:border-red-400 font-bold text-slate-700"
                                        placeholder="הקלד הודעת מערכת חדשה כאן..."
                                        value={newMsgText}
                                        onChange={(e) => setNewMsgText(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && addSystemMessage()}
                                    />
                                    <button onClick={addSystemMessage} className="bg-red-600 text-white px-8 py-4 rounded-2xl font-black hover:bg-red-700 cursor-pointer shadow-md">
                                        הוסף הודעה
                                    </button>
                                </div>
                                {systemMessages.length > 0 && (
                                    <div className="space-y-3 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                        {systemMessages.map((msg) => (
                                            <div key={msg.id} className="flex justify-between items-center bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                                                <div className="flex items-center gap-4">
                                                    <span className="text-sm font-bold text-slate-500 bg-slate-100 px-3 py-1 rounded-lg">{msg.date}</span>
                                                    <span className="font-bold text-slate-800 text-lg">{msg.text}</span>
                                                </div>
                                                <button onClick={() => removeSystemMessage(msg.id)} className="text-red-400 hover:text-red-600 hover:bg-red-50 p-2 rounded-lg cursor-pointer">מחק</button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </section>
                )}


                {/* --- אזור 2: חיפוש כללי מתקדם (Search Bar) --- */}
                <section className="mt-4 2xl:mt-10 mb-8 2xl:mb-24 relative text-center">
                    <div className="max-w-2xl 2xl:max-w-3xl mx-auto relative">
                        <Search className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5 2xl:w-7 2xl:h-7" />
                        <input className="w-full pr-14 2xl:pr-16 pl-6 py-3 2xl:py-6 rounded-2xl 2xl:rounded-3xl border-none shadow-xl 2xl:shadow-2xl text-base 2xl:text-xl font-medium outline-none focus:ring-4 focus:ring-red-600/10 transition-all" placeholder="חפש מוצרים, אנשי קשר או נהלים..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                    </div>
                </section>


                {/* --- אזור 3: קטגוריות ומוצרים (Sections Loop) --- */}
                <div className="relative w-full">

                    {/* באנר ימי ההולדת מופיע בצד רק אם שורת החיפוש ריקה */}
                    {searchTerm.trim() === '' && <BirthdayTicker />}

                    {/* לולאה שעוברת על כל הקטגוריות במערכת */}
                    {sections.map(section => {
                        const colors = getColorClasses(section.color);
                        // סינון פריטים בקטגוריה (גם לפי חיפוש וגם לפי הרשאות!)
                        const visibleItems = section.items.filter((item: any) => {

                            // 1. סינון לפי הרשאות צפייה של הכרטיסייה
                            const visibilityStr = item.visibility || 'הכל';
                            if (!isEditMode && visibilityStr !== 'הכל') {
                                // הגנות: מוודאים שלא קורסים אם אחד הערכים מה-AD חסר (null)
                                const userDept = initialUser?.department ? String(initialUser.department).toLowerCase() : "";
                                const userName = initialUser?.username ? String(initialUser.username).toLowerCase() : "";
                                const userTitle = initialUser?.title ? String(initialUser.title).toLowerCase() : "";
                                const userGroups = Array.isArray(initialUser?.groups) ? initialUser.groups : [];

                                // הגנה: תמיכה גם אם visibility הוא מערך (Array) וגם אם הוא טקסט מופרד בפסיקים (String)
                                const visibilityArray = typeof visibilityStr === 'string'
                                    ? visibilityStr.split(',')
                                    : (Array.isArray(visibilityStr) ? visibilityStr : []);

                                // מנקים רווחים והופכים לאותיות קטנות רק אם הערך קיים
                                const allowedUsersOrDepts = visibilityArray.map((s: any) => s ? String(s).toLowerCase().trim() : "");

                                // בדיקת קבוצות בטוחה! (בודק ש-group לא null לפני שהוא עושה toLowerCase)
                                const hasGroupAccess = userGroups.some((group: any) =>
                                    group && allowedUsersOrDepts.includes(String(group).toLowerCase())
                                );

                                // אם המחלקה, השם, הטייטל או אחת מהקבוצות שלו לא ברשימה - הוא חסום
                                if (!allowedUsersOrDepts.includes(userDept) &&
                                    !allowedUsersOrDepts.includes(userName) &&
                                    !allowedUsersOrDepts.includes(userTitle) &&
                                    !hasGroupAccess) {
                                    return false;
                                }
                            }

                            // 2. סינון לפי חיפוש טקסט רגיל (עם הגנות מ-null)
                            if (!searchTerm) return true;
                            return Object.entries(item.data).some(([key, val]: any) => {
                                // הוספנו f.name? כדי שאם חסר שם לקובץ, זה לא יקריס את החיפוש
                                if (Array.isArray(val)) return val.some((f: any) => f && f.name && f.name.toLowerCase().includes(searchTerm.toLowerCase()));
                                return typeof val === 'string' && val.toLowerCase().includes(searchTerm.toLowerCase());
                            });
                        });
                        // הסתרת קטגוריות ריקות במצב צפייה
                        if (!isEditMode && visibleItems.length === 0) return null;

                        return (
                            <section key={section.id} className="mb-12 2xl:mb-20 pl-0 lg:pl-[340px] xl:pl-[380px] 2xl:pl-[420px]">
                                {/* כותרת הקטגוריה ופעולות עריכה */}
                                <div className="flex items-center gap-3 2xl:gap-4 mb-6 2xl:mb-10">
                                    <h2 className={`text-2xl 2xl:text-3xl font-black flex items-center gap-3 2xl:gap-4 text-slate-800`}>
                                        <span className={`w-3 2xl:w-4 h-8 2xl:h-10 rounded-full ${colors.bg}`}></span>
                                        {section.title} <span className="text-slate-400 font-normal text-xl 2xl:text-2xl">({visibleItems.length})</span>
                                    </h2>

                                    {isEditMode && (
                                        <div className="flex gap-2 items-center">
                                            <button onClick={() => openEditSectionModal(section)} className="p-1.5 2xl:p-2 text-slate-400 hover:text-blue-500 cursor-pointer hover:bg-blue-50 rounded-full transition-all" title="ערוך קטגוריה">
                                                <Edit size={20} className="2xl:w-[22px] 2xl:h-[22px]" />
                                            </button>
                                            <button onClick={() => handleDeleteSection(section.id)} className="p-1.5 2xl:p-2 text-slate-400 hover:text-red-500 cursor-pointer hover:bg-red-50 rounded-full transition-all" title="מחק קטגוריה">
                                                <Trash2 size={20} className="2xl:w-[22px] 2xl:h-[22px]" />
                                            </button>
                                        </div>
                                    )}
                                </div>

                                {/* גריד הכרטיסיות (מוצרים/נהלים) */}
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 2xl:gap-8">
                                    {visibleItems.map((item: any) => {
                                        const theme = getCardGradientTheme(section.color);
                                        const rawTitle = item.data[section.schema[0]?.key];
                                        const displayTitle = (typeof rawTitle === 'string' || typeof rawTitle === 'number') ? rawTitle : (rawTitle ? "(תוכן מורכב)" : "ללא כותרת");

                                        return (
                                            <div
                                                key={item.id}
                                                // לוגיקת הלחיצה: האם לפתוח כמודל או כקישור ישיר (אם יש רק קישור בכרטיסייה)
                                                onClick={() => {
                                                    try {
                                                        if (isEditMode) { setViewItem({ item, section }); return; }

                                                        let foundUrl = null;
                                                        let foundUrlKey = null;

                                                        if (item?.data) {
                                                            for (const key in item.data) {
                                                                const val = item.data[key];
                                                                if (typeof val === 'string') {
                                                                    // 1. זיהוי קישור אינטרנט רגיל
                                                                    if (val.startsWith('http') || val.startsWith('www.')) {
                                                                        foundUrl = val.startsWith('www.') ? 'https://' + val : val;
                                                                        foundUrlKey = key;
                                                                        break;
                                                                    }

                                                                    // 2. זיהוי נתיב תיקייה (רשת או מקומי) והמרתו לפרוטוקול file
                                                                    if (val.startsWith('\\\\') || /^[a-zA-Z]:\\/.test(val)) {
                                                                        let fileUrl = val.replace(/\\/g, '/'); // החלפת לוכסנים

                                                                        if (val.startsWith('\\\\')) {
                                                                            // נתיב רשת: מ- \\server\folder ל- file://server/folder
                                                                            foundUrl = 'file://' + fileUrl.substring(2);
                                                                        } else {
                                                                            // כונן מקומי: מ- C:\folder ל- file:///C:/folder
                                                                            foundUrl = 'file:///' + fileUrl;
                                                                        }

                                                                        foundUrlKey = key;
                                                                        break;
                                                                    }
                                                                }
                                                            }
                                                        }

                                                        // בדיקה אם יש תוכן נוסף (כדי לדעת אם לפתוח מודל או לשגר ישירות)
                                                        let hasExtraContent = false;
                                                        if (item?.data) {
                                                            const titleKey = section?.schema?.[0]?.key;
                                                            for (const key in item.data) {
                                                                if (key === foundUrlKey || key === titleKey) continue;
                                                                const val = item.data[key];
                                                                let isEmpty = false;
                                                                if (val === null || val === undefined) isEmpty = true;
                                                                else if (typeof val === 'string') {
                                                                    const cleanVal = val.replace(/<[^>]*>?/gm, '').replace(/&nbsp;/g, '').trim();
                                                                    if (cleanVal === '') isEmpty = true;
                                                                } else if (Array.isArray(val) && val.length === 0) isEmpty = true;

                                                                if (!isEmpty) { hasExtraContent = true; break; }
                                                            }
                                                        }

                                                        // החלטת הניתוב
                                                        if (foundUrl && !hasExtraContent) {
                                                            window.open(foundUrl, '_blank', 'noopener,noreferrer');
                                                        } else {
                                                            setViewItem({ item, section });
                                                        }
                                                    } catch (error) {
                                                        setViewItem({ item, section });
                                                    }
                                                }}
                                                className={`relative group flex flex-col items-center justify-center text-center h-[130px] 2xl:h-[200px] p-4 2xl:p-5 bg-white rounded-[1.2rem] 2xl:rounded-[1.5rem] border-2 ${theme.border} shadow-lg ${theme.shadow} bg-gradient-to-br hover:border-transparent ${theme.gradientFrom} ${theme.gradientTo} hover:shadow-xl ${theme.hoverShadow} transition-all duration-500 ease-in-out hover:-translate-y-1 cursor-pointer overflow-hidden`}
                                            >
                                                {/* אייקון רקע דקורטיבי */}
                                                <div className={`absolute -right-4 2xl:-right-6 -bottom-4 2xl:-bottom-6 rotate-12 transition-all duration-700 group-hover:rotate-0 group-hover:scale-110 group-hover:text-white/10 ${theme.iconColor} scale-75 2xl:scale-100`}>
                                                    <FileText size={90} />
                                                </div>

                                                {/* תגית הרשאות שמופיעה רק למנהל על הכרטיסייה עצמה */}
                                                {isEditMode && item.visibility && item.visibility !== 'הכל' && (
                                                    <div className="absolute top-3 right-3 z-30 pointer-events-none">
                                                    </div>
                                                )}

                                                {/* כותרת הכרטיסייה */}
                                                <div className="relative z-10 flex flex-col items-center gap-2 transition-colors duration-300 w-full">
                                                    <h3 className={`text-lg 2xl:text-xl font-extrabold text-slate-800 line-clamp-2 leading-tight group-hover:text-white w-full`}>
                                                        {displayTitle}
                                                    </h3>
                                                </div>

                                                {/* טקסט ריחוף (Hover) דינמי - קישור או פריט */}
                                                <div className={`absolute bottom-3 2xl:bottom-4 text-[10px] font-bold px-3 2xl:px-4 py-1 2xl:py-1.5 rounded-full bg-white/20 backdrop-blur-md text-white border border-white/30 opacity-0 translate-y-3 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-500 delay-100 shadow-sm`}>
                                                    {(() => {
                                                        // מציאת הפריט הרלוונטי כדי לדעת מה לכתוב
                                                        const keys = Object.keys(item.data);
                                                        const folderKey = keys.find(k => typeof item.data[k] === 'string' && (item.data[k].startsWith('\\\\') || /^[a-zA-Z]:\\/.test(item.data[k])));
                                                        const linkKey = keys.find(k => typeof item.data[k] === 'string' && (item.data[k].startsWith('http') || item.data[k].startsWith('www.')));

                                                        // בדיקה האם זה הפריט היחיד (ללא תוכן נוסף)
                                                        const isOnlyItem = !keys.some(key => key !== folderKey && key !== linkKey && key !== section.schema[0]?.key && item.data[key] && (!Array.isArray(item.data[key]) || item.data[key].length > 0));

                                                        if (folderKey && isOnlyItem) return 'פתח תיקייה 📁';
                                                        if (linkKey && isOnlyItem) return 'פתח קישור ↗';
                                                        return 'לחץ לצפייה';
                                                    })()}
                                                </div>
                                                {/* כפתורי עריכת/מחיקת כרטיסייה (מצב עריכה) */}
                                                {isEditMode && (
                                                    <div className="absolute top-2 2xl:top-3 left-2 2xl:left-3 flex gap-1 2xl:gap-1.5 opacity-0 group-hover:opacity-100 transition-all duration-200 z-20">
                                                        <button onClick={(e) => { e.stopPropagation(); openEditItemModal(section, item); }} className="p-1 2xl:p-1.5 bg-white/20 backdrop-blur-md cursor-pointer text-white hover:bg-white hover:text-blue-600 rounded-full shadow-sm border border-white/30 hover:scale-110 active:scale-95 transition-all">
                                                            <Edit size={14} />
                                                        </button>
                                                        <button onClick={(e) => { e.stopPropagation(); handleDeleteItem(section.id, item.id); }} className="p-1 2xl:p-1.5 bg-white/20 backdrop-blur-md text-white cursor-pointer hover:bg-white hover:text-red-500 rounded-full shadow-sm border border-white/30 hover:scale-110 active:scale-95 transition-all">
                                                            <Trash2 size={14} />
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}

                                    {/* כרטיסיית הוספת פריט חדש לקטגוריה (מצב עריכה) */}
                                    {isEditMode && (
                                        <button
                                            onClick={() => { setTargetSection(section); setShowAddItemModal(true); }}
                                            className={`h-[130px] 2xl:h-[200px] flex flex-col items-center justify-center gap-2 2xl:gap-3 rounded-[1.2rem] 2xl:rounded-[1.5rem] border-2 border-dashed ${colors.border} ${colors.light} bg-opacity-30 hover:bg-opacity-100 hover:scale-[1.02] active:scale-95 transition-all cursor-pointer group text-slate-400 hover:text-slate-600`}
                                        >
                                            <div className={`p-2 2xl:p-4 rounded-full bg-white shadow-sm group-hover:scale-110 transition-transform ${colors.text}`}>
                                                <Plus size={24} className="2xl:w-8 2xl:h-8" />
                                            </div>
                                            <span className="font-bold text-sm 2xl:text-base">הוסף ל-{section.title}</span>
                                        </button>
                                    )}
                                </div>
                            </section>
                        );
                    })}
                </div>

                {/* --- אזור 3.5: הוספת קטגוריה (מוצג רק בעריכה - מעל ספר הטלפונים) --- */}
                {isEditMode && (
                    <section className="mt-12 mb-20 text-center border-t border-slate-100 pt-0">
                        <button 
                            onClick={() => { setShowCreateSectionModal(true); setNewSectionFields([{ key: 'f_title', label: 'כותרת ראשית (חובה)', type: 'text' }]); }} 
                            className="bg-slate-900 text-white px-10 py-5 rounded-[2rem] font-black text-lg cursor-pointer shadow-xl hover:scale-105 transition-transform flex items-center gap-4 mx-auto hover:shadow-slate-500/20"
                        >
                            <Plus size={24} /> צור קטגוריה חדשה
                        </button>
                        <p className="text-slate-400 mt-4 text-sm font-medium">הוסף קטגוריה חדשה לניהול מוצרים או נהלים</p>
                    </section>
                )}


                {/* --- אזור 4: ספר טלפונים קבוע בפינה השמאלית תחתונה --- */}
                <div className="mt-4 md:mt-12 2xl:mt-20 w-full px-4 md:px-8">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 mb-8 w-full">                        <div>
                        <div className="flex items-center gap-3 mb-2">
                            <div className="h-8 w-1.5 bg-amber-500 rounded-full"></div>
                            <h2 className="text-3xl font-black text-slate-800 tracking-tight">ספר טלפונים </h2>
                        </div>
                        <p className="text-slate-500 font-medium mr-4">ניהול רשימת קשר ומידע מחלקתי</p>
                    </div>

                        {/* כפתור עריכת/שמירת ספר טלפונים */}
                        <div className="flex gap-4 items-center">
                            {isEditMode && (
                                <button
                                    onClick={() => {
                                        if (isPhonebookEditMode) {
                                            // שמירה ל-State ולמסד הנתונים
                                            setPhonebookData(draftPhonebook);
                                            savePhonebookData(draftPhonebook);
                                            setIsPhonebookEditMode(false);
                                        } else {
                                            // העתקה לטיוטה ומעבר לעריכה
                                            setDraftPhonebook([...phonebookData]);
                                            setIsPhonebookEditMode(true);
                                        }
                                    }}
                                    className={`flex items-center gap-2 px-6 py-3 cursor-pointer rounded-2xl font-bold transition-all shadow-lg ${isPhonebookEditMode ? 'bg-slate-900 text-amber-400' : 'bg-white text-slate-600 border border-slate-100 hover:bg-slate-50'}`}
                                >
                                    {isPhonebookEditMode ? <Check size={20} /> : <Edit size={20} />}
                                    {isPhonebookEditMode ? 'שמור שינויים' : 'ערוך טבלה'}
                                </button>
                            )}
                        </div>
                    </div>

                    {/* מסגרת הטבלה ופעולות נוספות */}
                    <div className={`w-full relative bg-white rounded-[2.5rem] border-2 border-amber-100 shadow-[0_20px_50px_rgba(245,158,11,0.05)] overflow-hidden bg-gradient-to-br from-white via-white to-amber-50/30`}>

                        {/* כפתורי הוספה ואקסל (מוצג במצב עריכת טבלה) */}
                        {isPhonebookEditMode && (
                            <div className="w-full md:w-auto p-4 md:p-8 border-t border-amber-50 flex flex-col md:flex-row justify-center gap-3 md:gap-4 bg-amber-50/30">                                <button onClick={addPhonebookRow} className="flex items-center gap-3 cursor-pointer text-white font-black bg-slate-900 px-8 py-4 rounded-[2rem] hover:bg-amber-500 hover:scale-105 transition-all shadow-xl">
                                <Plus size={20} /> הוסף ידנית
                            </button>
                                <label className="w-full md:w-auto flex items-center gap-3 cursor-pointer text-slate-900 font-black bg-amber-400 px-8 py-4 rounded-[2rem] hover:bg-amber-500 hover:scale-105 transition-all shadow-xl">
                                    <Upload size={20} /> ייבא מאקסל
                                    <input type="file" accept=".xlsx, .xls, .csv" className="hidden" onChange={handleExcelUpload} />
                                </label>
                                <button onClick={downloadExcelTemplate} className="w-full md:w-auto flex items-center gap-3 cursor-pointer text-amber-800 font-black bg-amber-100 border-2 border-amber-200 px-8 py-4 rounded-[2rem] hover:bg-amber-200 hover:scale-105 transition-all shadow-sm">
                                    <Download size={20} /> הורד תבנית
                                </button>
                            </div>
                        )}

                        {/* טאבים של מחלקות (מוצג רק במצב צפייה) */}
                        {!isPhonebookEditMode && (
                            <div className="flex flex-wrap justify-center gap-2 2xl:gap-3 mt-8 mb-6 px-2">
                                {['הכל', ...Array.from(new Set(phonebookData.map(row => row.department).filter(Boolean)))].map(dept => (
                                    <button
                                        key={dept as string}
                                        onClick={() => {
                                            setSelectedDept(dept as string);
                                            if (scrollContainerRef.current) scrollContainerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
                                        }}
                                        className={`px-5 py-2 2xl:py-2.5 rounded-full font-bold text-sm 2xl:text-base transition-all shadow-sm cursor-pointer ${selectedDept === dept ? 'bg-amber-500 text-white shadow-amber-500/30 scale-105' : 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-50 hover:text-amber-600'}`}
                                    >
                                        {dept as string}
                                    </button>
                                ))}
                            </div>
                        )}

                        {/* טבלת העובדים (כולל תמיכה בגרירה - DND) */}
                        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handlePhonebookDragEnd}>
                            <div className="w-full px-2 2xl:px-6">
                                <div
                                    ref={scrollContainerRef}
                                    className="max-h-[50vh] 2xl:max-h-[60vh] overflow-y-auto overflow-x-auto rounded-[2rem] pb-2 pt-0 px-2 pr-4 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-amber-200 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-amber-300 transition-colors duration-300"                                >
                                    <table className="w-full min-w-[900px] lg:min-w-full table-fixed text-right border-separate border-spacing-y-2 2xl:border-spacing-y-3 relative">
                                        <thead className="sticky top-0 z-50">
                                            <tr className="text-amber-700 relative z-50">
                                                {isPhonebookEditMode && <th className="w-8 rounded-r-2xl bg-white shadow-[0_-15px_0_0_white,0_4px_6px_-1px_rgba(0,0,0,0.05)]"></th>}
                                                {phonebookSchema.filter(col => isPhonebookEditMode || col.key !== 'birthday').map((col, idx, arr) => (
                                                    <th key={col.key} className={`${col.width} px-2 py-3 2xl:py-5 text-xs 2xl:text-lg font-black uppercase tracking-tight text-right bg-white shadow-[0_-15px_0_0_white,0_4px_6px_-1px_rgba(0,0,0,0.05)] ${!isPhonebookEditMode && idx === 0 ? 'rounded-r-2xl' : ''} ${!isPhonebookEditMode && idx === arr.length - 1 ? 'rounded-l-2xl' : ''}`}>
                                                        <span className="drop-shadow-sm truncate block">{col.label}</span>
                                                    </th>
                                                ))}
                                                {isPhonebookEditMode && <th className="w-12 rounded-l-2xl bg-white shadow-[0_-15px_0_0_white,0_4px_6px_-1px_rgba(0,0,0,0.05)]"></th>}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {(() => {
                                                // קביעת מקור הנתונים וסינון כפול (לפי טאב המחלקה ושורת החיפוש)
                                                const currentData = isPhonebookEditMode ? draftPhonebook : phonebookData;
                                                const filteredRows = currentData.filter(row => {
                                                    if (selectedDept !== 'הכל' && row.department !== selectedDept) return false;
                                                    if (searchTerm) return Object.values(row).some(val => String(val).toLowerCase().includes(searchTerm.toLowerCase()));
                                                    return true;
                                                });

                                                if (filteredRows.length === 0) return <tr><td colSpan={10} className="text-center py-20 text-slate-300 font-bold text-xl italic bg-white/50 rounded-2xl">לא נמצאו תוצאות למחלקה או לחיפוש...</td></tr>;

                                                return (
                                                    <SortableContext items={filteredRows.map(row => row.id)} strategy={verticalListSortingStrategy}>
                                                        {filteredRows.map((row) => (
                                                            <SortableRow
                                                                key={row.id} row={row} phonebookSchema={phonebookSchema}
                                                                isPhonebookEditMode={isPhonebookEditMode}
                                                                updatePhonebookCell={updatePhonebookCell}
                                                                deletePhonebookRow={deletePhonebookRow}
                                                            />
                                                        ))}
                                                    </SortableContext>
                                                );
                                            })()}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </DndContext>
                    </div>
                </div>

                {/* --- אזור 5: הגדרות מערכת וסיום הדף (בתחתית המסך) --- */}
                {isEditMode && (
                    <div className="mt-24 pt-12 border-t-2 border-slate-200 max-w-4xl mx-auto px-4 mb-10">

                        <div className="text-center mb-8">
                            <h3 className="font-black text-slate-400 tracking-wider text-sm md:text-base bg-slate-50 inline-block px-6 py-2 rounded-full border border-slate-200">
                                הגדרות אווירה מיוחדות
                            </h3>
                        </div>

                        {/* קוביות השליטה של החגים (מוסתרות בתחתית) */}
                        <div className="flex flex-col gap-4 mb-16 opacity-80 hover:opacity-100 transition-opacity duration-300">

                            {/* קישוט יום העצמאות */}
                            <div className="bg-white p-4 rounded-3xl border border-blue-100 shadow-sm flex items-center justify-between transition-all hover:shadow-md">
                                <div className="flex items-center gap-4">
                                    <div className="bg-blue-50 w-12 h-12 rounded-xl text-blue-600 flex items-center justify-center font-black text-lg">
                                        IL
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-slate-800 text-base">קישוט יום העצמאות</h4>
                                        <p className="text-sm text-slate-500 font-medium">הצג שרשרת דגלים מתנפנפת בראש הפורטל</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setShowHolidayDecor(!showHolidayDecor)}
                                    className={`relative inline-flex h-8 w-16 items-center rounded-full transition-colors duration-300 focus:outline-none cursor-pointer ${showHolidayDecor ? 'bg-blue-600 shadow-md shadow-blue-500/30' : 'bg-slate-200'}`}
                                >
                                    <span className={`inline-block h-6 w-6 transform rounded-full bg-white shadow-sm transition-transform duration-300 ${showHolidayDecor ? '-translate-x-9' : '-translate-x-1'}`} />
                                </button>
                            </div>

                            {/* פס ימי הזיכרון */}
                            <div className="bg-white p-4 rounded-3xl border border-slate-800 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4 transition-all hover:shadow-md">
                                <div className="flex items-center gap-4">
                                    <div className="bg-slate-900 w-12 h-12 rounded-xl text-amber-500 flex items-center justify-center text-2xl">
                                        🕯️
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-slate-800 text-base">פס ימי הזיכרון</h4>
                                        <p className="text-sm text-slate-500 font-medium">הצג באנר שחור עליון עם נר נשמה</p>
                                    </div>
                                </div>

                                <div className="flex bg-slate-50 p-1.5 rounded-2xl border border-slate-100 w-full md:w-auto">
                                    <button
                                        onClick={() => setMemorialDayType(null)}
                                        className={`flex-1 md:flex-none px-4 py-2 rounded-xl text-sm font-bold transition-all cursor-pointer ${memorialDayType === null ? 'bg-white shadow text-slate-800' : 'text-slate-400 hover:text-slate-600'}`}
                                    >
                                        כבוי
                                    </button>
                                    <button
                                        onClick={() => setMemorialDayType('holocaust')}
                                        className={`flex-1 md:flex-none px-4 py-2 rounded-xl text-sm font-bold transition-all cursor-pointer ${memorialDayType === 'holocaust' ? 'bg-slate-900 shadow text-white' : 'text-slate-400 hover:text-slate-600'}`}
                                    >
                                        יום הזיכרון לשואה
                                    </button>
                                    <button
                                        onClick={() => setMemorialDayType('idf')}
                                        className={`flex-1 md:flex-none px-4 py-2 rounded-xl text-sm font-bold transition-all cursor-pointer ${memorialDayType === 'idf' ? 'bg-slate-900 shadow text-white' : 'text-slate-400 hover:text-slate-600'}`}
                                    >
                                        יום הזיכרון לחללי צה"ל
                                    </button>
                                </div>
                            </div>

                        </div>
                    </div>
                )}
            </main>

            {/* ==================== חלונות קופצים (MODALS) ==================== */}

            {/* --- מודל 1: צפייה בפרטי פריט --- */}
            {viewItem && (() => {
                const colors = getColorClasses(viewItem.section.color);
                return (
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-6 animate-in fade-in duration-200" onClick={() => setViewItem(null)}>
                        <div className="bg-white rounded-[2.5rem] w-full max-w-3xl shadow-2xl relative border border-gray-100 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                            <button onClick={() => setViewItem(null)} className="absolute top-8 left-8 text-slate-400 cursor-pointer hover:text-slate-600 bg-slate-50 p-3 rounded-full hover:bg-slate-100 transition"><X size={28} /></button>

                            <div className="p-10 pb-6 border-b border-slate-100">
                                <h2 className={`text-5xl font-black ${colors.text} mb-3`}>{viewItem.item.data[viewItem.section.schema[0].key]}</h2>
                                {viewItem.section.schema[1] && viewItem.section.schema[1].type === 'text' && viewItem.item.data[viewItem.section.schema[1].key] && (
                                    <p className="text-2xl font-bold text-slate-500">{viewItem.item.data[viewItem.section.schema[1].key]}</p>
                                )}
                            </div>

                            <div className="p-10 space-y-8">
                                {/* לולאה דינמית שמרנדרת שדות בהתאם לסכמה של הקטגוריה */}
                                {viewItem.section.schema.slice(viewItem.section.schema[1]?.type === 'text' ? 2 : 1).map((field: any) => {
                                    const rawVal = viewItem.item.data[field.key];

                                    // הגנות מפני נתונים חסרים או לא תואמים לסוג השדה
                                    if (rawVal === undefined || rawVal === null || rawVal === '') return null;
                                    const isArray = Array.isArray(rawVal);
                                    const isObject = typeof rawVal === 'object' && !isArray && rawVal !== null;
                                    const isString = typeof rawVal === 'string' || typeof rawVal === 'number';
                                    const isPhoneRow = isObject && 'name' in rawVal && 'role' in rawVal;
                                    if (isPhoneRow || (field.type === 'text' && !isString)) return null;

                                    return (
                                        <div key={field.key} className="mb-6">
                                            <div className="flex items-center gap-3 mb-3">
                                                <span className={`text-sm font-black uppercase tracking-wider ${colors.text} opacity-80`}>{field.label}</span>
                                                <div className="h-px flex-1 bg-slate-100"></div>
                                            </div>

                                            {/* סוגי שדות */}
                                            {field.type === 'text' && isString && <p className="text-xl font-medium text-slate-800 leading-relaxed">{rawVal}</p>}
                                            {field.type === 'textarea' && isString && <div className="bg-slate-50 p-6 rounded-3xl text-lg text-slate-700 whitespace-pre-line leading-loose border border-slate-100">{rawVal}</div>}
                                            {field.type === 'link' && isString && (
                                                <a href={rawVal as string} target="_blank" rel="noopener noreferrer" className={`flex items-center gap-4 font-bold text-lg ${colors.text} hover:underline bg-${viewItem.section.color}-50 p-4 rounded-2xl transition-colors dir-ltr w-fit`}>
                                                    <ExternalLink size={24} /> <span>{rawVal}</span>
                                                </a>
                                            )}
                                            {field.type === 'file' && isArray && (
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    {rawVal.map((f: any, i: number) => (
                                                        <a key={i} href={f.content} download={f.name} className="flex items-center justify-between gap-4 font-bold text-base text-slate-700 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 p-4 rounded-2xl transition-all border border-slate-200 group">
                                                            <div className="flex items-center gap-3 overflow-hidden">
                                                                <div className={`bg-${viewItem.section.color}-100 p-2 rounded-xl text-${viewItem.section.color}-600`}><File size={20} /></div>
                                                                <span className="truncate">{f.name}</span>
                                                            </div>
                                                            <Download size={20} className="text-slate-400 group-hover:text-slate-600" />
                                                        </a>
                                                    ))}
                                                </div>
                                            )}
                                            {field.type === 'password' && isObject && rawVal.password && (
                                                <div className="bg-amber-50 p-6 rounded-3xl border border-amber-100 grid grid-cols-1 md:grid-cols-2 gap-6">
                                                    {rawVal.username && (
                                                        <div className="flex justify-between items-center bg-white p-4 rounded-2xl border border-amber-200">
                                                            <div><span className="text-xs font-bold text-amber-500 uppercase block mb-1">משתמש</span><span className="font-mono font-bold text-xl text-amber-900">{rawVal.username}</span></div>
                                                            <button onClick={() => copyToClipboard(rawVal.username, 'u_view')} className="text-amber-400 hover:text-amber-600 bg-amber-50 p-2 rounded-lg transition-colors">{copiedField === 'u_view' ? <Check size={20} /> : <Copy size={20} />}</button>
                                                        </div>
                                                    )}
                                                    <div className={`flex justify-between items-center bg-white p-4 rounded-2xl border transition-all ${unlockedPasswords[field.key] > 0 ? 'border-red-200 bg-red-50' : 'border-amber-200'}`}>
                                                        <div>
                                                            <span className={`text-xs font-bold uppercase block mb-1 ${unlockedPasswords[field.key] > 0 ? 'text-red-500' : 'text-amber-500'}`}>
                                                                {unlockedPasswords[field.key] > 0 ? `פתוח ל-${unlockedPasswords[field.key]} שניות` : 'סיסמה'}
                                                            </span>
                                                            <span className={`font-mono font-bold text-xl ${unlockedPasswords[field.key] > 0 ? 'text-red-900' : 'text-amber-900'}`} dir="ltr">
                                                                {unlockedPasswords[field.key] > 0 ? rawVal.password : '••••••'}
                                                            </span>
                                                        </div>
                                                        <div className="flex gap-2">
                                                            {unlockedPasswords[field.key] > 0 ? (
                                                                <button onClick={() => copyToClipboard(rawVal.password, field.key)} className="flex items-center gap-2 bg-white text-red-600 border border-red-100 px-4 py-2 rounded-xl font-bold hover:bg-red-100 transition-all shadow-sm">
                                                                    <span>העתק</span>{copiedField === field.key ? <Check size={20} /> : <Copy size={20} />}
                                                                </button>
                                                            ) : (
                                                                <button onClick={() => handlePasswordAction('toggle', field.key, rawVal.password)} className="bg-amber-50 text-amber-400 hover:text-amber-600 hover:bg-amber-100 p-3 rounded-xl transition-all"><Eye size={24} /></button>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                            {field.type === 'folder' && isString && (
                                                <button
                                                    onClick={() => {
                                                        let fileUrl = (rawVal as string).replace(/\\/g, '/');
                                                        let finalUrl = (rawVal as string).startsWith('\\\\')
                                                            ? 'file://' + fileUrl.substring(2)
                                                            : 'file:///' + fileUrl;
                                                        window.open(finalUrl, '_blank', 'noopener,noreferrer');
                                                    }}
                                                    /* העיצוב השורתי: flex, p-4, background עדין, rounded-2xl */
                                                    className={`flex items-center gap-3.5 font-bold text-lg ${colors.text} hover:bg-${viewItem.section.color}-100 bg-${viewItem.section.color}-50 p-4 rounded-2xl transition-colors dir-ltr w-fit group`}
                                                >
                                                    {/* אייקון התיקייה - מיושר לצד */}
                                                    <div className={`text-${viewItem.section.color}-500 group-hover:scale-110 transition-transform`}>
                                                        <Folder size={24} />
                                                    </div>

                                                    {/* הנתיב - עם truncate כדי לא לשבור את השורה */}
                                                    <span className="truncate flex-1 font-mono text-base">{rawVal}</span>

                                                    {/* אייקון ה'יציאה' - קטן ובצד, כמו בכחול */}
                                                    <ExternalLink size={18} className="opacity-40 group-hover:opacity-100 transition-opacity shrink-0" />
                                                </button>
                                            )}
                                            {field.type === 'phonebook' && isArray && rawVal.length > 0 && (
                                                <div className="overflow-hidden rounded-2xl border border-slate-200 shadow-sm">
                                                    <table className="w-full text-right text-sm">
                                                        <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider">
                                                            <tr>
                                                                <th className="px-6 py-4">שם העובד</th><th className="px-6 py-4">מחלקה</th><th className="px-6 py-4">תפקיד</th><th className="px-6 py-4">טלפון אישי</th><th className="px-6 py-4">שלוחה</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className="divide-y divide-slate-100 bg-white">
                                                            {rawVal.map((row: any, i: number) => (
                                                                <tr key={i} className="hover:bg-slate-50 transition-colors">
                                                                    <td className="px-6 py-4 font-bold text-slate-800">{typeof row.name === 'string' ? row.name : ''}</td>
                                                                    <td className="px-6 py-4 font-bold text-slate-800">{typeof row.department === 'string' ? row.department : ''}</td>
                                                                    <td className="px-6 py-4 text-slate-600">{typeof row.role === 'string' ? row.role : ''}</td>
                                                                    <td className="px-6 py-4 font-mono text-slate-600 dir-ltr text-right">{typeof row.phone === 'string' ? row.phone : ''}</td>
                                                                    <td className="px-6 py-4 font-mono font-bold text-blue-600">{typeof row.ext === 'string' ? row.ext : ''}</td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                );
            })()}

            {/* --- מודל 2: בונה הקטגוריות (עם DND לבחירת סדר שדות) --- */}
            {showCreateSectionModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => { setShowCreateSectionModal(false); setEditingSectionId(null); setNewSectionTitle(""); setNewSectionFields([]); }}>
                    <div className="bg-white relative rounded-[2.5rem] w-full max-w-3xl max-h-[90vh] overflow-y-auto shadow-2xl p-10 animate-in fade-in zoom-in duration-200" onClick={(e) => e.stopPropagation()}>
                        <div className="flex justify-between items-center mb-8">
                            <h2 className="text-3xl font-black text-slate-800">{editingSectionId ? 'עריכת קטגוריה' : 'הגדרת קטגוריה חדשה'}</h2>
                            <button onClick={() => { setShowCreateSectionModal(false); setEditingSectionId(null); setNewSectionTitle(""); setNewSectionFields([]); }} className="absolute top-8 left-8 text-slate-400 transition-colors cursor-pointer hover:text-slate-600 hover:bg-slate-100 p-2 rounded-full">
                                <X size={28} />
                            </button>
                        </div>

                        <div className="space-y-8">
                            <div>
                                <label className="block text-sm font-bold text-slate-400 uppercase mb-3">שם הקטגוריה</label>
                                <input className="w-full text-2xl font-bold border-b-2 border-slate-200 focus:border-red-500 outline-none py-3 bg-transparent" placeholder="למשל: שרתים, מוצרים..." value={newSectionTitle} onChange={e => setNewSectionTitle(e.target.value)} />
                            </div>

                            <div className="bg-slate-50 p-8 rounded-3xl border border-slate-100">
                                <label className="block text-sm font-bold text-slate-500 mb-6 uppercase flex items-center gap-2"><LayoutGrid size={20} /> מבנה הכרטיסייה (גרור לשינוי סדר)</label>
                                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                                    <SortableContext items={newSectionFields.map(f => f.key)} strategy={verticalListSortingStrategy}>
                                        <div className="space-y-4">
                                            {newSectionFields.map((field, idx) => (
                                                <SortableField key={field.key} field={field} idx={idx} updateFieldInSchema={updateFieldInSchema} removeFieldFromSchema={removeFieldFromSchema} />
                                            ))}
                                        </div>
                                    </SortableContext>
                                </DndContext>
                                <button onClick={addFieldToSchema} className="mt-6 text-base font-bold text-red-600 hover:text-red-700 flex items-center gap-2 py-3 px-5 rounded-xl transition-colors w-fit cursor-pointer hover:bg-red-50 active:scale-95"><Plus size={20} /> הוסף שדה נוסף</button>
                            </div>

                            <button onClick={handleSaveSection} className={`w-full ${editingSectionId ? 'bg-blue-600' : 'bg-slate-900'} text-white py-5 rounded-2xl font-bold text-xl hover:opacity-90 shadow-lg shadow-slate-200 transition-all cursor-pointer hover:scale-[1.02] active:scale-95`}>
                                {editingSectionId ? 'שמור שינויים' : 'שמור וצור קטגוריה'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* --- מודל 3: טופס הוספת/עריכת פריט (מוצרים/נהלים) --- */}
            {showAddItemModal && targetSection && (() => {
                const colors = getColorClasses(targetSection.color);
                return (
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => { setShowAddItemModal(false); setEditingItemId(null); setNewItemData({}); }}>
                        <div className="bg-white rounded-[2.5rem] w-full max-w-xl shadow-2xl p-10 relative max-h-[90vh] overflow-y-auto custom-scrollbar" onClick={(e) => e.stopPropagation()}>                            <button onClick={() => { setShowAddItemModal(false); setEditingItemId(null); setNewItemData({}); }} className="absolute top-8 left-8 cursor-pointer text-slate-400 hover:text-slate-600"><X size={28} /></button>
                            <h2 className="text-3xl font-black mb-8 pr-4">
                                {editingItemId ? 'עריכת פריט ב' : 'הוסף פריט ל'}<span className={colors.text}> {targetSection.title}</span>
                            </h2>

                            {/* --- מנגנון הרשאות לפריט (צ'קבוקסים דינמיים + יוזרים וטייטלים) --- */}
                            <div className="mb-6 bg-slate-50 p-6 rounded-3xl border border-slate-100">
                                <label className="block text-sm font-bold text-slate-500 uppercase mb-4">מי יכול לראות את הכרטיסייה הזו?</label>
                                <div className="flex flex-wrap gap-3">
                                    <label className={`flex items-center gap-2 px-4 py-2 rounded-xl border cursor-pointer transition-all ${newItemVisibility.includes('הכל') || newItemVisibility.length === 0 ? 'bg-red-50 border-red-500 text-red-700 font-bold shadow-sm' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
                                        <input type="checkbox" className="hidden"
                                            checked={newItemVisibility.includes('הכל') || newItemVisibility.length === 0}
                                            onChange={(e) => {
                                                if (e.target.checked) setNewItemVisibility(['הכל']);
                                            }}
                                        />
                                        הכל (פתוח לכולם)
                                    </label>

                                    {Array.from(new Set(phonebookData.map((row: any) => row.department).filter(Boolean))).map((dept: any) => (
                                        <label key={dept} className={`flex items-center gap-2 px-4 py-2 rounded-xl border cursor-pointer transition-all ${!newItemVisibility.includes('הכל') && newItemVisibility.includes(dept) ? 'bg-amber-50 border-amber-500 text-amber-700 font-bold shadow-sm' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
                                            <input type="checkbox" className="hidden"
                                                checked={!newItemVisibility.includes('הכל') && newItemVisibility.includes(dept)}
                                                onChange={(e) => {
                                                    if (e.target.checked) {
                                                        setNewItemVisibility((prev: any) => prev.filter((v: any) => v !== 'הכל').concat(dept));
                                                    } else {
                                                        const next = newItemVisibility.filter((v: any) => v !== dept);
                                                        setNewItemVisibility(next.length === 0 ? ['הכל'] : next);
                                                    }
                                                }}
                                            />
                                            {dept}
                                        </label>
                                    ))}
                                </div>

                                {/* התוספת החדשה: חציצת תגיות (Tags) למשתמשים וטייטלים */}
                                <div className="mt-5 pt-5 border-t border-slate-200">
                                    <label className="block text-sm font-bold text-slate-600 mb-2">
                                        מורשים נוספים (לפי שם משתמש או טייטל)
                                    </label>

                                    {(() => {
                                        const allDepts = Array.from(new Set(phonebookData.map((row: any) => row.department).filter(Boolean)));
                                        const customTags = newItemVisibility.filter((v: any) => v !== 'הכל' && !allDepts.includes(v));

                                        return (
                                            <div className="space-y-3">
                                                {/* שדה הזנה וכפתור - הוספה חופשית ללא שאילתות לשרת */}
                                                <div className="flex gap-2 relative">
                                                    <input
                                                        type="text"
                                                        id="customTagInput"
                                                        className="flex-1 border border-slate-200 rounded-xl p-3 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-50 text-base bg-white transition-all disabled:bg-slate-50"
                                                        placeholder="הקלד שם או טייטל ולחץ Enter..."
                                                        onKeyDown={async (e) => {
                                                            if (e.key === 'Enter' || e.key === 'NumpadEnter' || e.key === ',') {
                                                                e.preventDefault();
                                                                e.stopPropagation();

                                                                const inputElement = e.currentTarget;
                                                                const val = inputElement.value.trim();

                                                                if (val && !newItemVisibility.includes(val)) {
                                                                    inputElement.disabled = true; // נועלים כדי למנוע לחיצות כפולות

                                                                    try {
                                                                        // פנייה לנתיב החדש שיצרנו
                                                                        const res = await fetch(`/api/user?search=${encodeURIComponent(val)}`);
                                                                        const result = await res.json();

                                                                        if (result.exists) {
                                                                            // המשתמש/טייטל אומת מול ה-AD!
                                                                            setNewItemVisibility((prev: any) => [...prev.filter((v: any) => v !== 'הכל'), val]);
                                                                            inputElement.value = '';
                                                                        } else {
                                                                            alert(`לא נמצא משתמש או הרשאה בשם "${val}" ב-AD הארגוני.`);
                                                                        }
                                                                    } catch (err) {
                                                                        alert("שגיאת תקשורת מול השרת בבדיקת ההרשאה.");
                                                                    } finally {
                                                                        inputElement.disabled = false;
                                                                        inputElement.focus();
                                                                    }
                                                                }
                                                            }
                                                        }}
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={async (e) => {
                                                            e.preventDefault();
                                                            const inputElement = document.getElementById('customTagInput') as HTMLInputElement;
                                                            if (!inputElement) return;

                                                            const val = inputElement.value.trim();
                                                            if (val && !newItemVisibility.includes(val)) {
                                                                inputElement.disabled = true;

                                                                try {
                                                                    const res = await fetch(`/api/user?search=${encodeURIComponent(val)}`);
                                                                    const result = await res.json();

                                                                    if (result.exists) {
                                                                        setNewItemVisibility((prev: any) => [...prev.filter((v: any) => v !== 'הכל'), val]);
                                                                        inputElement.value = '';
                                                                    } else {
                                                                        alert(`הערך "${val}" לא קיים ב-AD.`);
                                                                    }
                                                                } catch (err) {
                                                                    alert("שגיאת תקשורת.");
                                                                } finally {
                                                                    inputElement.disabled = false;
                                                                    inputElement.focus();
                                                                }
                                                            }
                                                        }}
                                                        className="bg-blue-50 text-blue-600 font-bold px-6 rounded-xl hover:bg-blue-100 transition-colors border border-blue-200 cursor-pointer"
                                                    >
                                                        הוסף
                                                    </button>
                                                </div>

                                                {/* 2. מתחת לזה: אזור תצוגת התגיות השחורות וכפתור המחיקה */}
                                                <div className="flex flex-wrap gap-2 pt-1">
                                                    {newItemVisibility && newItemVisibility.map((tag: string, index: number) => (
                                                        tag !== 'הכל' && (
                                                            <div
                                                                key={index}
                                                                className="flex items-center gap-2 bg-slate-800 text-white px-3 py-1.5 rounded-lg text-sm font-medium shadow-sm"
                                                            >
                                                                <span>{tag}</span>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => {
                                                                        // מחיקת ההרשאה מהמערך
                                                                        setNewItemVisibility((prev: any) => prev.filter((item: string) => item !== tag));
                                                                    }}
                                                                    className="text-slate-300 hover:text-red-400 transition-colors focus:outline-none flex items-center justify-center"
                                                                    title="הסר הרשאה"
                                                                >
                                                                    ✕
                                                                </button>
                                                            </div>
                                                        )
                                                    ))}
                                                </div>
                                            </div>
                                        );
                                    })()}
                                    <p className="text-xs text-slate-400 mt-2 font-medium">הקלד שם ולחץ Enter. ברגע שתוסיף מורשים, הכרטיסייה תינעל רק אליהם.</p>
                                </div>
                            </div>
                            <div className="space-y-6 max-h-[60vh] overflow-y-auto px-1">
                                {/* יצירת אינפוטים דינמיים לפי הסכמה */}
                                {targetSection.schema.map((field: any, idx: number) => (
                                    <div key={field.key}>
                                        <label className="block text-sm font-bold text-slate-400 uppercase mb-2">{field.label}</label>

                                        {field.type === 'text' && <input className={`w-full border border-slate-200 rounded-2xl p-4 outline-none focus:border-slate-500 focus:ring-4 focus:ring-slate-100 transition-all ${idx === 0 ? 'text-xl font-bold' : ''}`} placeholder={idx === 0 ? `הכנס ${field.label}...` : ''} value={newItemData[field.key] || ''} onChange={e => setNewItemData({ ...newItemData, [field.key]: e.target.value })} />}
                                        {field.type === 'textarea' && <textarea rows={4} className="w-full border border-slate-200 rounded-2xl p-4 outline-none focus:border-slate-500 focus:ring-4 focus:ring-slate-100 transition-all text-lg" value={newItemData[field.key] || ''} onChange={e => setNewItemData({ ...newItemData, [field.key]: e.target.value })} />}
                                        {field.type === 'link' && (
                                            <div className="relative">
                                                <div className="absolute top-4 right-4 text-slate-400 pointer-events-none"><LinkIcon size={20} /></div>
                                                <input className="w-full border border-slate-200 rounded-2xl p-4 pr-12 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-50 text-left dir-ltr transition-all font-mono text-base" placeholder="https://..." value={newItemData[field.key] || ''} onChange={e => setNewItemData({ ...newItemData, [field.key]: e.target.value })} />
                                            </div>
                                        )}
                                        {field.type === 'folder' && (
                                            <div className="relative">
                                                <div className="absolute top-4 right-4 text-slate-400 pointer-events-none">
                                                    <Folder size={20} />
                                                </div>
                                                <input
                                                    className="w-full border border-slate-200 rounded-2xl p-4 pr-12 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-50 text-left dir-ltr transition-all font-mono text-base bg-white"
                                                    placeholder="\\server\share\folder או S:\Folder"
                                                    value={newItemData[field.key] || ''}
                                                    onChange={e => setNewItemData({ ...newItemData, [field.key]: e.target.value })}
                                                />
                                            </div>
                                        )}
                                        {field.type === 'password' && (
                                            <div className="bg-amber-50 p-4 rounded-2xl border border-amber-100 grid grid-cols-2 gap-4">
                                                <input className="w-full border border-amber-200 rounded-xl p-3 outline-none text-base bg-white" placeholder="שם משתמש" value={newItemData[field.key]?.username || ''} onChange={e => setNewItemData({ ...newItemData, [field.key]: { ...newItemData[field.key], username: e.target.value } })} />
                                                <input className="w-full border border-amber-200 rounded-xl p-3 outline-none text-base bg-white" placeholder="סיסמה" value={newItemData[field.key]?.password || ''} onChange={e => setNewItemData({ ...newItemData, [field.key]: { ...newItemData[field.key], password: e.target.value } })} />
                                            </div>
                                        )}
                                        {field.type === 'phonebook' && (() => {
                                            const rows = Array.isArray(newItemData[field.key]) ? newItemData[field.key] : [];
                                            const updateRow = (index: number, fieldName: string, val: string) => { const newRows = [...rows]; newRows[index] = { ...newRows[index], [fieldName]: val }; setNewItemData({ ...newItemData, [field.key]: newRows }); };
                                            const addRow = () => { setNewItemData({ ...newItemData, [field.key]: [...rows, { name: '', department: '', role: '', phone: '', ext: '' }] }); };
                                            const removeRow = (index: number) => { const newRows = rows.filter((_: any, i: number) => i !== index); setNewItemData({ ...newItemData, [field.key]: newRows }); };
                                            return (
                                                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                                                    <div className="space-y-3">
                                                        {rows.map((row: any, i: number) => (
                                                            <div key={i} className="flex gap-2 items-center bg-white p-2 rounded-xl border border-slate-100 shadow-sm">
                                                                <div className="bg-slate-100 w-8 h-8 flex items-center justify-center rounded-full text-xs font-bold shrink-0">{i + 1}</div>
                                                                <input placeholder="שם מלא" className="w-1/5 p-2 bg-transparent outline-none border-b border-transparent focus:border-blue-500 text-sm" value={row.name} onChange={e => updateRow(i, 'name', e.target.value)} />
                                                                <div className="w-px h-6 bg-slate-100"></div>
                                                                <input placeholder="מחלקה" className="w-1/5 p-2 bg-transparent outline-none border-b border-transparent focus:border-blue-500 text-sm" value={row.department || ''} onChange={e => updateRow(i, 'department', e.target.value)} />
                                                                <div className="w-px h-6 bg-slate-100"></div>
                                                                <input placeholder="תפקיד" className="w-1/5 p-2 bg-transparent outline-none border-b border-transparent focus:border-blue-500 text-sm" value={row.role} onChange={e => updateRow(i, 'role', e.target.value)} />
                                                                <div className="w-px h-6 bg-slate-100"></div>
                                                                <input placeholder="נייד" className="w-1/5 p-2 bg-transparent outline-none border-b border-transparent focus:border-blue-500 text-sm" value={row.phone} onChange={e => updateRow(i, 'phone', e.target.value)} />
                                                                <div className="w-px h-6 bg-slate-100"></div>
                                                                <input placeholder="שלוחה" className="w-20 p-2 bg-transparent outline-none border-b border-transparent focus:border-blue-500 text-sm" value={row.ext} onChange={e => updateRow(i, 'ext', e.target.value)} />
                                                                <button onClick={() => removeRow(i)} className="text-slate-300 hover:text-red-500 p-1"><Trash2 size={16} /></button>
                                                            </div>
                                                        ))}
                                                    </div>
                                                    <button onClick={addRow} className="mt-4 flex items-center gap-2 text-sm font-bold text-blue-600 hover:bg-blue-50 px-4 py-2 rounded-lg transition-colors cursor-pointer">
                                                        <Plus size={16} /> הוסף עובד
                                                    </button>
                                                </div>
                                            );
                                        })()}
                                    </div>
                                ))}
                            </div>
                            <button onClick={handleSaveItem} className={`w-full ${colors.bg} text-white py-5 rounded-2xl cursor-pointer font-bold text-xl mt-8 hover:opacity-90 shadow-lg shadow-slate-200`}>
                                {editingItemId ? 'עדכן פריט' : 'שמור פריט'}
                            </button>
                        </div>
                    </div>
                );
            })()}

            {/* --- מודל 4: התחברות למצב אדמין --- */}
            {
                showLoginModal && (
                    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60]" onClick={() => setShowLoginModal(false)}>
                        <div className="bg-white p-10 rounded-[2.5rem] w-96 text-center shadow-2xl" onClick={(e) => e.stopPropagation()}>
                            <h3 className="font-bold text-2xl mb-8">כניסה למערכת</h3>
                            <form onSubmit={(e) => { e.preventDefault(); handleLogin(); }}>
                                <input className="w-full border bg-slate-50 p-4 mb-3 rounded-2xl outline-none focus:border-red-500 text-lg" placeholder="שם משתמש" value={loginCredentials.username} onChange={e => setLoginCredentials({ ...loginCredentials, username: e.target.value })} autoFocus />
                                <input className="w-full border bg-slate-50 p-4 mb-8 rounded-2xl outline-none focus:border-red-500 text-lg" type="password" placeholder="סיסמה" value={loginCredentials.password} onChange={e => setLoginCredentials({ ...loginCredentials, password: e.target.value })} />
                                <button type="submit" className="bg-slate-900 text-white px-6 py-4 rounded-2xl w-full font-bold text-lg hover:bg-slate-700 hover:scale-[1.02] cursor-pointer active:scale-95 transition-all shadow-lg hover:shadow-slate-500/30">התחבר</button>
                            </form>
                            <button onClick={() => setShowLoginModal(false)} className="text-sm text-slate-400 mt-6 cursor-pointer hover:text-slate-600">ביטול</button>
                        </div>
                    </div>
                )
            }

            {/* --- מודל 5: בדיקת אבטחה לחשיפת סיסמאות --- */}
            {
                showSecurityModal && (
                    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[70] backdrop-blur-sm" onClick={() => setShowSecurityModal(false)}>
                        <div className="bg-white p-8 rounded-3xl w-80 text-center shadow-2xl border border-slate-100 animate-in zoom-in duration-200" onClick={(e) => e.stopPropagation()}>
                            <div className="bg-amber-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 text-amber-600">
                                <Lock size={32} />
                            </div>
                            <h3 className="font-black text-xl mb-2 text-slate-800">בדיקת אבטחה</h3>
                            <p className="text-slate-500 text-sm mb-6 font-medium">נא להזין סיסמה לצפייה/העתקה</p>
                            <form onSubmit={handleSecurityVerify}>
                                <input type="password" className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl mb-4 outline-none focus:border-amber-500 focus:ring-4 focus:ring-amber-100 text-center font-bold text-lg tracking-widest" placeholder="******" value={securityInput} onChange={e => setSecurityInput(e.target.value)} autoFocus />
                                <button type="submit" className="bg-slate-900 text-white w-full py-3 rounded-xl font-bold hover:bg-slate-800 transition-all shadow-lg shadow-slate-200">אישור</button>
                            </form>
                            <button onClick={() => setShowSecurityModal(false)} className="mt-4 text-sm text-slate-400 font-bold hover:text-slate-600">ביטול</button>
                        </div>
                    </div>
                )
            }

        </div >
    );
}