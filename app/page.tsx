"use client";

import React, { useState, useEffect } from 'react';
import {
    Search, Plus, FileText, Trash2, X, Key, Lock, Unlock, Edit,
    ExternalLink, Copy, Check, LayoutGrid, Link as LinkIcon, File, Eye, Upload, Download, EyeOff, GripVertical, Gift
} from 'lucide-react';

import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
    useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
function SortableRow({ row, phonebookSchema, isPhonebookEditMode, updatePhonebookCell, deletePhonebookRow }: any) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: row.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 50 : 0,
        position: 'relative' as 'relative',
    };

    return (
        <tr ref={setNodeRef} style={style} className={`
            group transition-all duration-500 ease-in-out
            bg-white rounded-[1.5rem] border-2 border-slate-50
            shadow-sm hover:shadow-xl hover:shadow-amber-200/20
            ${isDragging ? 'opacity-50 shadow-2xl scale-[1.02] z-50' : ''}
            hover:border-transparent hover:bg-gradient-to-l hover:from-amber-400 hover:to-yellow-500
            hover:-translate-y-1.5 cursor-default
        `}>
            {/* כפתור גרירה - מופיע רק בעריכה */}
            {isPhonebookEditMode && (
                <td className="px-2 py-5 text-center first:rounded-r-[1.5rem]">
                    <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing text-slate-300 hover:text-amber-700 p-2 outline-none">
                        <GripVertical size={20} />
                    </div>
                </td>
            )}

            {phonebookSchema.filter((col: any) => isPhonebookEditMode || col.key !== 'birthday').map((col: any) => (
                <td key={col.key} className={`px-6 py-5 ${!isPhonebookEditMode && 'first:rounded-r-[1.5rem]'} last:rounded-l-[1.5rem]`}>
                    {isPhonebookEditMode ? (
                        <input
                            value={row[col.key] || ''}
                            onChange={e => updatePhonebookCell(row.id, col.key, e.target.value)}
                            className="w-full bg-slate-50 border border-slate-100 rounded-xl p-3 focus:bg-white focus:ring-4 focus:ring-amber-100 outline-none font-bold text-slate-800 transition-all"
                            placeholder={col.key === 'birthday' ? '24.02' : ''}
                        />
                    ) : (
                        <span className="text-lg font-extrabold text-slate-700 group-hover:text-white transition-colors duration-300">
                            {row[col.key] || '---'}
                        </span>
                    )}
                </td>
            ))}

            {isPhonebookEditMode && (
                <td className="px-6 py-4 text-left rounded-l-[1.5rem]">
                    <button onClick={() => deletePhonebookRow(row.id)} className="bg-red-50 text-red-500 hover:bg-white p-3 rounded-xl transition-all shadow-sm cursor-pointer">
                        <Trash2 size={20} />
                    </button>
                </td>
            )}
        </tr>
    );
}
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
            </select>

            <button onClick={() => removeFieldFromSchema(field.key)} className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity p-2 rounded-full hover:bg-red-50 cursor-pointer">
                <Trash2 size={20} />
            </button>
        </div>

    );
}

export default function DynamicIPIDashboard() {
    const [phonebookSearch, setPhonebookSearch] = useState("");

    // ==================== STATE ====================
    const [sections, setSections] = useState<any[]>([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [isEditMode, setIsEditMode] = useState(false);
    const [showLoginModal, setShowLoginModal] = useState(false);
    const [loginCredentials, setLoginCredentials] = useState({ username: '', password: '' });

    // --- יצירת/עריכת קטגוריה (Schema Builder) ---
    const [showCreateSectionModal, setShowCreateSectionModal] = useState(false);
    const [newSectionTitle, setNewSectionTitle] = useState("");
    const [newSectionFields, setNewSectionFields] = useState<{ key: string, label: string, type: string }[]>([]);
    const [editingSectionId, setEditingSectionId] = useState<number | null>(null);

    // --- יצירת/עריכת פריט (Dynamic Form) ---
    const [showAddItemModal, setShowAddItemModal] = useState(false);
    const [targetSection, setTargetSection] = useState<any>(null);
    const [newItemData, setNewItemData] = useState<any>({});
    const [editingItemId, setEditingItemId] = useState<number | null>(null);

    // --- צפייה בפריט (Details Modal) ---
    const [viewItem, setViewItem] = useState<{ item: any, section: any } | null>(null);

    // --- עזרים ---
    const [copiedField, setCopiedField] = useState<string | null>(null);

    // משתנה לניהול חשיפת סיסמאות
    const [visiblePasswords, setVisiblePasswords] = useState<Record<string, boolean>>({});

    // --- אבטחת סיסמאות ---
    const [showSecurityModal, setShowSecurityModal] = useState(false);
    const [securityInput, setSecurityInput] = useState("");
    const [pendingAction, setPendingAction] = useState<{ type: 'toggle' | 'copy', key: string, value: string } | null>(null);


    // ==================== LOAD DATA ====================
    useEffect(() => { fetchSections(); }, []);

    const fetchSections = async () => {
        try {
            const res = await fetch('/api/sections');
            if (res.ok) setSections(await res.json());
        } catch (e) { console.error(e); }
    };

    // ==================== LOGIC ====================

    // --- ניהול סכמה (שדות) ---
    const addFieldToSchema = () => {
        const key = `f_${Date.now()}`;
        setNewSectionFields([...newSectionFields, { key, label: '', type: 'text' }]);
    };
    // --- DND SENSORS ---
    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    // --- פונקציה לסיום גרירה ---
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

    // --- עדכון פונקציות (לפי Key במקום Index) ---
    const removeFieldFromSchema = (keyToRemove: string) => { // שים לב לשינוי כאן
        setNewSectionFields(fields => fields.filter(f => f.key !== keyToRemove));
    };
    const updateFieldInSchema = (keyToUpdate: string, fieldName: string, value: string) => { // וגם כאן
        setNewSectionFields(fields => fields.map(f =>
            f.key === keyToUpdate ? { ...f, [fieldName]: value } : f
        ));
    };

    // --- שמירת קטגוריה ---
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

    // --- שמירת פריט ---
    const handleSaveItem = async () => {
        const action = editingItemId ? 'update_item' : 'add_item';
        await fetch('/api/sections', {
            method: 'POST',
            body: JSON.stringify({ action, sectionId: targetSection.id, itemId: editingItemId, data: newItemData })
        });
        await fetchSections();
        setShowAddItemModal(false); setNewItemData({}); setEditingItemId(null);
    };

    const openEditItemModal = (section: any, item: any) => {
        setTargetSection(section);
        setNewItemData({ ...item.data });
        setEditingItemId(item.id);
        setShowAddItemModal(true);
    };

    // --- מחיקות ---
    const handleDeleteSection = async (id: number) => {
        if (!confirm('למחוק את כל הקטגוריה?')) return;
        await fetch('/api/sections', { method: 'POST', body: JSON.stringify({ action: 'delete_section', id }) });
        await fetchSections();
    };
    const handleDeleteItem = async (sectionId: number, itemId: number) => {
        if (!confirm('למחוק פריט זה?')) return;
        await fetch('/api/sections', { method: 'POST', body: JSON.stringify({ action: 'delete_item', sectionId, itemId }) });
        await fetchSections();
        if (viewItem?.item.id === itemId) setViewItem(null);
    };

    // --- ניהול קבצים (מרובה) ---
    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>, fieldKey: string) => {
        const files = e.target.files;
        if (files && files.length > 0) {
            const fileReaders: Promise<any>[] = [];

            // המרת כל הקבצים ל-Base64
            Array.from(files).forEach(file => {
                const reader = new FileReader();
                const promise = new Promise((resolve) => {
                    reader.onloadend = () => resolve({ name: file.name, content: reader.result });
                });
                reader.readAsDataURL(file);
                fileReaders.push(promise);
            });

            // המתנה לכולם ושמירה במערך
            const newFiles = await Promise.all(fileReaders);

            setNewItemData((prev: any) => {
                const existingFiles = prev[fieldKey] || [];
                return {
                    ...prev,
                    [fieldKey]: [...existingFiles, ...newFiles] // הוספה לרשימה הקיימת
                };
            });
        }
        e.target.value = ""; // איפוס ה-Input כדי לאפשר בחירה חוזרת של אותו קובץ
    };

    // מחיקת קובץ בודד מהרשימה בזמן העריכה
    const handleRemoveFile = (fieldKey: string, indexToRemove: number) => {
        setNewItemData((prev: any) => {
            const currentFiles = prev[fieldKey] || [];
            return {
                ...prev,
                [fieldKey]: currentFiles.filter((_: any, idx: number) => idx !== indexToRemove)
            };
        });
    };

    // --- עזרים ---
    const handleLogin = () => {
        if (loginCredentials.username === 'admin' && loginCredentials.password === '123456') {
            setIsEditMode(true); setShowLoginModal(false); setLoginCredentials({ username: '', password: '' });
        } else alert('שגיאה');
    };

    const copyToClipboard = (text: string, id: string) => {
        navigator.clipboard.writeText(text);
        setCopiedField(id);
        setTimeout(() => setCopiedField(null), 2000);
    };

    const handlePhonebookDragEnd = (event: any) => {
        const { active, over } = event;
        if (active.id !== over.id) {
            const oldIndex = phonebookData.findIndex((row) => row.id === active.id);
            const newIndex = phonebookData.findIndex((row) => row.id === over.id);
            const newData = arrayMove(phonebookData, oldIndex, newIndex);
            savePhonebookData(newData); // זה גם יעדכן את ה-State וגם ישלח ל-API
        }
    };
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

    // פונקציית עזר חדשה לניהול פלטת הצבעים של הכרטיסים המודרניים
    const getCardGradientTheme = (color: string) => {
        const themes: any = {
            red: {
                border: 'border-red-200', shadow: 'shadow-red-100', hoverShadow: 'hover:shadow-red-500/40',
                gradientFrom: 'hover:from-red-500', gradientTo: 'hover:to-red-600', iconColor: 'text-red-50'
            },
            blue: {
                border: 'border-blue-200', shadow: 'shadow-blue-100', hoverShadow: 'hover:shadow-blue-500/40',
                gradientFrom: 'hover:from-blue-500', gradientTo: 'hover:to-blue-600', iconColor: 'text-blue-50'
            },
            green: {
                border: 'border-green-200', shadow: 'shadow-green-100', hoverShadow: 'hover:shadow-green-500/40',
                gradientFrom: 'hover:from-green-500', gradientTo: 'hover:to-green-600', iconColor: 'text-green-50'
            },
            purple: {
                border: 'border-purple-200', shadow: 'shadow-purple-100', hoverShadow: 'hover:shadow-purple-500/40',
                gradientFrom: 'hover:from-purple-500', gradientTo: 'hover:to-purple-600', iconColor: 'text-purple-50'
            },
            orange: {
                border: 'border-orange-200', shadow: 'shadow-orange-100', hoverShadow: 'hover:shadow-orange-500/40',
                gradientFrom: 'hover:from-orange-500', gradientTo: 'hover:to-orange-600', iconColor: 'text-orange-50'
            },
            teal: {
                border: 'border-teal-200', shadow: 'shadow-teal-100', hoverShadow: 'hover:shadow-teal-500/40',
                gradientFrom: 'hover:from-teal-500', gradientTo: 'hover:to-teal-600', iconColor: 'text-teal-50'
            },
            indigo: {
                border: 'border-indigo-200', shadow: 'shadow-indigo-100', hoverShadow: 'hover:shadow-indigo-500/40',
                gradientFrom: 'hover:from-indigo-500', gradientTo: 'hover:to-indigo-600', iconColor: 'text-indigo-50'
            },
            pink: {
                border: 'border-pink-200', shadow: 'shadow-pink-100', hoverShadow: 'hover:shadow-pink-500/40',
                gradientFrom: 'hover:from-pink-500', gradientTo: 'hover:to-pink-600', iconColor: 'text-pink-50'
            },
        };
        return themes[color] || themes['red'];
    };

    const handlePasswordAction = (type: 'toggle' | 'copy', key: string, value: string) => {
        // 1. אם הפעולה היא הסתרה - בצע מיד
        if (type === 'toggle' && visiblePasswords[key]) {
            setVisiblePasswords(prev => ({ ...prev, [key]: false }));
            return;
        }

        // 2. בדיקה: אם נשארו שניות בטיימר (גדול מ-0) - בצע מיד
        if (unlockedPasswords[key] > 0) {
            if (type === 'toggle') setVisiblePasswords(prev => ({ ...prev, [key]: true }));
            else copyToClipboard(value, key);
            return;
        }

        // 3. אחרת - פתח חלון אימות
        setPendingAction({ type, key, value });
        setSecurityInput("");
        setShowSecurityModal(true);
    };

    const handleSecurityVerify = (e: React.FormEvent) => {
        e.preventDefault();
        if (securityInput === '123456') { // סיסמת המאסטר
            const key = pendingAction!.key;
            let timeLeft = 10; // הזמן החדש: 10 שניות

            // עדכון ראשוני
            setUnlockedPasswords(prev => ({ ...prev, [key]: timeLeft }));

            // יצירת טיימר שרץ כל שנייה
            const timer = setInterval(() => {
                timeLeft -= 1;
                setUnlockedPasswords(prev => ({ ...prev, [key]: timeLeft }));

                // כשהזמן נגמר
                if (timeLeft <= 0) {
                    clearInterval(timer);
                    setVisiblePasswords(prev => ({ ...prev, [key]: false })); // הסתרה אוטומטית
                }
            }, 1000);

            // ביצוע הפעולה המבוקשת
            if (pendingAction?.type === 'toggle') {
                setVisiblePasswords(prev => ({ ...prev, [key]: true }));
            } else if (pendingAction?.type === 'copy') {
                copyToClipboard(pendingAction.value, key);
            }

            setShowSecurityModal(false);
            setPendingAction(null);
        } else {
            alert("סיסמה שגויה!");
        }
    };
    // שינוי: המערך מחזיק כעת את מספר השניות שנותרו לכל שדה
    const [unlockedPasswords, setUnlockedPasswords] = useState<Record<string, number>>({});

    const [isPhonebookEditMode, setIsPhonebookEditMode] = useState(false);
    useEffect(() => {
        const loadPhonebook = async () => {
            try {
                const res = await fetch('/api/phonebook');
                const json = await res.json();

                // אם ה-SQL מחזיר עמודות, נשתמש בהן. אם הוא ריק, נשתמש בברירת המחדל.
                if (json.schema && json.schema.length > 0) {
                    setPhonebookSchema(json.schema);
                }
                if (json.data) {
                    setPhonebookData(json.data);
                }
            } catch (error) {
                console.error("שגיאה בטעינת ספר טלפונים:", error);
            }
        };
        loadPhonebook();
    }, []);

    // שמירת נתונים
    const savePhonebookData = async (newData: any) => {
        setPhonebookData(newData);
        await fetch('/api/phonebook', {
            method: 'POST',
            body: JSON.stringify({ type: 'data', payload: newData })
        });
    };

    // שמירת מבנה
    const savePhonebookSchema = async (newSchema: any) => {
        setPhonebookSchema(newSchema);
        await fetch('/api/phonebook', {
            method: 'POST',
            body: JSON.stringify({ type: 'schema', payload: newSchema })
        });
    };
    const addColumn = () => {
        const newKey = `col_${Date.now()}`;
        savePhonebookSchema([...phonebookSchema, { key: newKey, label: "" }]);
    };

    // משתנה לניהול אישור מחיקה זמני
    const [columnToDelete, setColumnToDelete] = useState<string | null>(null);

    const removeColumn = (keyToRemove: string) => {
        // מחיקה מיידית ללא הודעת אישור
        const newSchema = phonebookSchema.filter(col => col.key !== keyToRemove);
        savePhonebookSchema(newSchema);
    };

    const updateColumnTitle = (key: string, newTitle: string) => {
        const newSchema = phonebookSchema.map(col => col.key === key ? { ...col, label: newTitle } : col);
        savePhonebookSchema(newSchema);
    };

    // --- ניהול שורות ---
    const addPhonebookRow = () => {
        const newRow: any = { id: Date.now() };
        // איתחול כל השדות הדינמיים
        phonebookSchema.forEach(col => newRow[col.key] = "");
        savePhonebookData([...phonebookData, newRow]);
    };

    const deletePhonebookRow = (id: number) => {
        savePhonebookData(phonebookData.filter(row => row.id !== id));
    };

    const updatePhonebookCell = (id: number, field: string, value: string) => {
        const updatedData = phonebookData.map(row =>
            row.id === id ? { ...row, [field]: value } : row
        );
        savePhonebookData(updatedData);
    };


    // הקפאת גלילה ברקע כאשר מודל פתוח
    useEffect(() => {
        const isAnyModalOpen = showCreateSectionModal || showAddItemModal || viewItem || showSecurityModal;

        if (isAnyModalOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }

        return () => { document.body.style.overflow = 'unset'; };
    }, [showCreateSectionModal, showAddItemModal, viewItem, showSecurityModal]);


    // --- ספר טלפונים (כולל ימי הולדת) ---
    const [phonebookData, setPhonebookData] = useState<any[]>([]);

    // הוספנו כאן את ה-birthday באופן קבוע
    const [phonebookSchema, setPhonebookSchema] = useState<{ key: string, label: string, width?: string }[]>([
        { key: 'name', label: 'שם העובד', width: 'w-1/4' },
        { key: 'role', label: 'תפקיד', width: 'w-1/4' },
        { key: 'phone', label: 'טלפון', width: 'w-1/4' },
        { key: 'ext', label: 'שלוחה', width: 'w-24' },
        { key: 'birthday', label: 'יום הולדת (יום.חודש)', width: 'w-32' },
    ]);

    // --- לוגיקת ימי הולדת (עם תיעדוף ל"היום" בראש הרשימה) ---
    const getBirthdayCelebrants = () => {
        const today = new Date();
        const currentMonth = today.getMonth() + 1;
        const currentDay = today.getDate();

        return phonebookData.filter(row => {
            if (!row.birthday) return false;
            // תמיכה בפורמטים 15.5, 15/05, 15.05.1990
            const parts = row.birthday.split(/[\.\/]/);
            if (parts.length < 2) return false;

            const month = parseInt(parts[1]);
            return month === currentMonth;
        }).map(row => {
            const parts = row.birthday.split(/[\.\/]/);
            const day = parseInt(parts[0]);
            const isToday = day === currentDay;
            return { ...row, isToday, day };
        }).sort((a, b) => {
            // חוק 1: מי שיש לו יום הולדת היום - עולה למעלה
            if (a.isToday && !b.isToday) return -1;
            if (!a.isToday && b.isToday) return 1;

            // חוק 2: כל השאר מסודרים לפי היום בחודש
            return a.day - b.day;
        });
    };
    const birthdayCelebrants = getBirthdayCelebrants();

    // --- רכיב באנר ימי הולדת (מיקום מתוקן - מקביל לכרטיסיות) ---
    const BirthdayTicker = () => {
        if (birthdayCelebrants.length === 0) return null;

        return (
            // שיניתי כאן ל- top-64 כדי להוריד אותו למטה לגובה הכרטיסיות
            <div className="absolute left-8 top-64 z-0 w-72 hidden 2xl:block animate-in fade-in slide-in-from-left-10 duration-1000">
                <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl border border-pink-100 overflow-hidden relative">
                    {/* כותרת */}
                    <div className="bg-gradient-to-r from-pink-500 to-rose-400 p-4 text-center">
                        <h3 className="text-white font-black text-xl flex justify-center items-center gap-2">
                            <Gift size={24} className="animate-bounce" />
                            חוגגים החודש!
                        </h3>
                    </div>

                    {/* רשימת חוגגים */}
                    <div className="p-4 space-y-3 max-h-[500px] overflow-y-auto no-scrollbar">
                        {birthdayCelebrants.map((person, idx) => (
                            <div key={idx} className={`
                              relative p-3 rounded-2xl border transition-all duration-500
                              ${person.isToday
                                    ? 'bg-gradient-to-br from-yellow-50 to-amber-50 border-amber-300 shadow-md scale-105'
                                    : 'bg-white border-slate-100'}
                          `}>
                                <div className="flex justify-between items-center">
                                    <div>
                                        <p className={`font-bold ${person.isToday ? 'text-amber-700 text-lg' : 'text-slate-700'}`}>
                                            {person.name}
                                        </p>
                                        <p className="text-sm text-slate-500 font-mono font-medium mt-0.5 flex items-center gap-1">
                                            📅 {person.birthday}
                                        </p>
                                    </div>
                                    {person.isToday ? <span className="text-3xl animate-pulse">🎂</span> : <span className="text-2xl opacity-60">🎈</span>}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        );
    };

    // ==================== RENDER ====================
    return (
        <div className="font-sans min-h-screen relative bg-slate-50 text-slate-900" dir="rtl">
            <BirthdayTicker />

            {/* HEADER */}
            <header className="max-w-7xl mx-auto px-6 py-10 flex justify-between items-center">
                <div className="flex items-center gap-5">
                    <div className="bg-red-600 p-5 rounded-3xl shadow-lg shadow-red-500/20">
                        <div className="text-white font-black text-5xl tracking-tighter px-2">IPI</div>
                    </div>
                    <div className="hidden md:block">
                        <h1 className="text-3xl font-extrabold text-red-600 tracking-tight">פורטל</h1>
                        <p className="text-sm text-slate-500 font-medium mt-1">IPI Portal</p>
                    </div>
                </div>
                <button
                    onClick={() => {
                        if (isEditMode) {
                            // אם אנחנו יוצאים ממצב עריכה
                            setIsEditMode(false);
                            setIsPhonebookEditMode(false); // <--- הוסף את השורה הזו כאן
                        } else {
                            setShowLoginModal(true);
                        }
                    }}
                    className={`flex items-center gap-3 px-6 py-3 rounded-full font-bold text-base cursor-pointer transition-all border shadow-sm 
                        ${isEditMode
                            ? 'bg-red-50 text-red-600 border-red-200 hover:bg-red-100 hover:border-red-300 hover:text-red-700'
                            : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50 hover:text-slate-700 hover:border-slate-300'
                        }`}
                >
                    {isEditMode ? <Unlock size={20} /> : <Lock size={20} />}
                    {isEditMode ? 'עריכה פעילה' : 'צפייה'}
                </button>
            </header>

            {/* MAIN CONTENT */}
            <main className="max-w-7xl mx-auto px-6 pb-32">

                {/* SEARCH */}
                <section className="mt-10 mb-24 relative text-center">
                    <h2 className="text-5xl font-black mb-8 tracking-tight">מרכז המידע והנהלים</h2>
                    <div className="max-w-3xl mx-auto relative">
                        <Search className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-400" size={28} />
                        <input className="w-full pr-16 pl-6 py-6 rounded-3xl border-none shadow-2xl text-xl font-medium outline-none focus:ring-4 focus:ring-red-600/10 transition-all" placeholder="חפש מוצרים, סיסמאות או נהלים..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                    </div>
                </section>

                {/* SECTIONS LOOP */}
                {sections.map(section => {
                    const colors = getColorClasses(section.color);

                    const visibleItems = section.items.filter((item: any) => {
                        if (!searchTerm) return true;
                        // חיפוש מותאם גם לקבצים
                        return Object.entries(item.data).some(([key, val]: any) => {
                            if (Array.isArray(val)) { // חיפוש בתוך מערך קבצים
                                return val.some((f: any) => f.name.toLowerCase().includes(searchTerm.toLowerCase()));
                            }
                            return typeof val === 'string' && val.toLowerCase().includes(searchTerm.toLowerCase());
                        });
                    });

                    if (!isEditMode && visibleItems.length === 0) return null;

                    return (
                        <section key={section.id} className="mb-20">
                            <div className="flex items-center gap-4 mb-10">
                                <h2 className={`text-3xl font-black flex items-center gap-4 text-slate-800`}>
                                    <span className={`w-4 h-10 rounded-full ${colors.bg}`}></span>
                                    {section.title} <span className="text-slate-400 font-normal text-2xl">({visibleItems.length})</span>
                                </h2>

                                {isEditMode && (
                                    <div className="flex gap-2 items-center">
                                        {/* מחקנו מכאן את absolute ואת left-4! */}
                                        <button
                                            onClick={() => openEditSectionModal(section)}
                                            className="p-2 text-slate-400 hover:text-blue-500 cursor-pointer hover:bg-blue-50 rounded-full transition-all"
                                            title="ערוך קטגוריה"
                                        >
                                            <Edit size={22} />
                                        </button>

                                        {/* מחקנו מכאן את absolute ואת left-4! */}
                                        <button
                                            onClick={() => handleDeleteSection(section.id)}
                                            className="p-2 text-slate-400 hover:text-red-500 cursor-pointer hover:bg-red-50 rounded-full transition-all"
                                            title="מחק קטגוריה"
                                        >
                                            <Trash2 size={22} />
                                        </button>
                                    </div>
                                )}
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                                {visibleItems.map((item: any) => {
                                    const theme = getCardGradientTheme(section.color);

                                    // --- הגנות למניעת קריסה ---
                                    // שליפת הכותרת
                                    const rawTitle = item.data[section.schema[0]?.key];
                                    // בדיקה: אם הכותרת היא אובייקט/מערך (כמו ספר טלפונים) - הצג טקסט חלופי
                                    const displayTitle = (typeof rawTitle === 'string' || typeof rawTitle === 'number')
                                        ? rawTitle
                                        : (rawTitle ? "(תוכן מורכב)" : "ללא כותרת");


                                    return (
                                        <div
                                            key={item.id}
                                            onClick={() => setViewItem({ item, section })}
                                            className={`
                                                relative group flex flex-col items-center justify-center text-center h-[200px] p-5
                                                bg-white rounded-[1.5rem] border-2 ${theme.border}
                                                shadow-lg ${theme.shadow}
                                                
                                                bg-gradient-to-br hover:border-transparent ${theme.gradientFrom} ${theme.gradientTo}
                                                hover:shadow-xl ${theme.hoverShadow}
                                                
                                                transition-all duration-500 ease-in-out hover:-translate-y-1
                                                cursor-pointer overflow-hidden
                                            `}
                                        >
                                            {/* אייקון רקע */}
                                            <div className={`absolute -right-6 -bottom-6 rotate-12 transition-all duration-700 group-hover:rotate-0 group-hover:scale-110 group-hover:text-white/10 ${theme.iconColor}`}>
                                                <FileText size={90} />
                                            </div>

                                            <div className="relative z-10 flex flex-col items-center gap-2 transition-colors duration-300 w-full">
                                                {/* כותרת מוגנת */}
                                                <h3 className={`text-xl font-extrabold text-slate-800 line-clamp-2 leading-tight group-hover:text-white w-full`}>
                                                    {displayTitle}
                                                </h3>
                                            </div>

                                            {/* כפתור צפייה */}
                                            <div className={`
                                                absolute bottom-4 text-[10px] font-bold px-4 py-1.5 rounded-full
                                                bg-white/20 backdrop-blur-md text-white border border-white/30
                                                opacity-0 translate-y-3 group-hover:opacity-100 group-hover:translate-y-0
                                                transition-all duration-500 delay-100 shadow-sm
                                            `}>
                                                לחץ לצפייה
                                            </div>

                                            {/* כפתורי עריכה */}
                                            {isEditMode && (
                                                <div className="absolute top-3 left-3 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-all duration-200 z-20">
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); openEditItemModal(section, item); }}
                                                        className="p-1.5 bg-white/20 backdrop-blur-md cursor-pointer text-white hover:bg-white hover:text-blue-600 rounded-full shadow-sm border border-white/30 hover:scale-110 active:scale-95 transition-all"
                                                    >
                                                        <Edit size={14} />
                                                    </button>
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); handleDeleteItem(section.id, item.id); }}
                                                        className="p-1.5 bg-white/20 backdrop-blur-md text-white cursor-pointer hover:bg-white hover:text-red-500 rounded-full shadow-sm border border-white/30 hover:scale-110 active:scale-95 transition-all"
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                                {isEditMode && (
                                    <button
                                        onClick={() => { setTargetSection(section); setShowAddItemModal(true); }}
                                        className={`
                                            h-[200px] flex flex-col items-center justify-center gap-3
                                            rounded-[1.5rem] border-2 border-dashed ${colors.border} ${colors.light} bg-opacity-30
                                            hover:bg-opacity-100 hover:scale-[1.02] active:scale-95
                                            transition-all cursor-pointer group text-slate-400 hover:text-slate-600
                                        `}
                                    >
                                        <div className={`p-4 rounded-full bg-white shadow-sm group-hover:scale-110 transition-transform ${colors.text}`}>
                                            <Plus size={32} />
                                        </div>
                                        <span className="font-bold text-base">הוסף ל-{section.title}</span>
                                    </button>
                                )}
                            </div>
                        </section>
                    );
                })}

                {/* 1. מיקום הבאנר - שים את זה מעל ה-div של הטבלה */}
                <BirthdayTicker />

                {/* --- אזור ספר טלפונים קבוע --- */}
                <div className="mt-20 mb-32 px-4">
                    {/* כותרת הסקשן */}
                    <div className="flex justify-between items-end mb-8 max-w-7xl mx-auto">
                        <div>
                            <div className="flex items-center gap-3 mb-2">
                                <div className="h-8 w-1.5 bg-amber-500 rounded-full"></div>
                                <h2 className="text-3xl font-black text-slate-800 tracking-tight">ספר טלפונים ארגוני</h2>
                            </div>
                            <p className="text-slate-500 font-medium mr-4">ניהול רשימת קשר ומידע מחלקתי</p>
                        </div>

                        {/* --- רכיב החיפוש החדש --- */}
                        <div className="flex gap-4 items-center">
                            <div className="relative">
                                <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                <input
                                    className="bg-white border border-slate-200 pr-11 pl-4 py-2.5 rounded-2xl outline-none focus:ring-4 focus:ring-amber-500/10 focus:border-amber-500 transition-all w-64 font-bold text-slate-700"
                                    placeholder="חיפוש מהיר בטבלה..."
                                    value={phonebookSearch}
                                    onChange={(e) => setPhonebookSearch(e.target.value)}
                                />
                            </div>

                            {isEditMode && (
                                <button
                                    onClick={() => setIsPhonebookEditMode(!isPhonebookEditMode)}
                                    className={`flex items-center gap-2 px-6 py-3 cursor-pointer rounded-2xl font-bold transition-all shadow-lg ${isPhonebookEditMode ? 'bg-slate-900 text-amber-400' : 'bg-white text-slate-600 border border-slate-100 hover:bg-slate-50'}`}
                                >
                                    {isPhonebookEditMode ? <Check size={20} /> : <Edit size={20} />}
                                    {isPhonebookEditMode ? 'שמור שינויים' : 'ערוך טבלה'}
                                </button>
                            )}
                        </div>
                    </div>
                    {/* גוף הטבלה */}
                    <div className={`
            max-w-7xl mx-auto
            relative bg-white rounded-[2.5rem] border-2 border-amber-100
            shadow-[0_20px_50px_rgba(245,158,11,0.05)] overflow-hidden
            bg-gradient-to-br from-white via-white to-amber-50/30
        `}>

                        <div className="overflow-x-auto">
                            <table className="w-full text-right border-separate border-spacing-y-3 px-6 py-6">
                                <thead>
                                    <tr className="text-amber-700">
                                        {isPhonebookEditMode && <th className="w-12"></th>}


                                        {/* לוגיקה חכמה: מסננים את יום ההולדת אם לא עורכים */}
                                        {phonebookSchema.filter(col => isPhonebookEditMode || col.key !== 'birthday').map(col => (
                                            <th key={col.key} className="px-6 py-4 text-xl font-black uppercase tracking-tight">
                                                <div className="flex items-center gap-2 group/col">
                                                    {isPhonebookEditMode ? (
                                                        <div className="flex items-center gap-2 w-full">
                                                            <input
                                                                value={col.label}
                                                                onChange={(e) => updateColumnTitle(col.key, e.target.value)}
                                                                className="bg-amber-100/50 border-b-2 border-amber-400 focus:border-amber-600 outline-none w-full py-2 font-black text-amber-900 rounded px-2 text-lg"
                                                            />
                                                            <button onClick={() => removeColumn(col.key)} className="text-amber-400 hover:text-red-500 transition-colors shrink-0 cursor-pointer"><X size={20} /></button>
                                                        </div>
                                                    ) : (
                                                        <span className="drop-shadow-sm">{col.label}</span>
                                                    )}
                                                </div>
                                            </th>
                                        ))}
                                        {isPhonebookEditMode && <th className="w-16 text-center"><button onClick={addColumn} className="bg-amber-600 text-white cursor-pointer p-2.5 rounded-xl hover:bg-amber-700 transition-all shadow-md"><Plus size={22} /></button></th>}
                                    </tr>
                                </thead>

                                <tbody>
                                    {(() => {
                                        // סינון השורות לפי החיפוש
                                        const filteredRows = phonebookData.filter(row => {
                                            if (!phonebookSearch) return true;
                                            return Object.values(row).some(val =>
                                                String(val).toLowerCase().includes(phonebookSearch.toLowerCase())
                                            );
                                        });

                                        if (filteredRows.length === 0) {
                                            return <tr><td colSpan={10} className="text-center py-20 text-slate-300 font-bold text-xl italic">לא נמצאו תוצאות לחיפוש...</td></tr>;
                                        }

                                        return (
                                            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handlePhonebookDragEnd}>
                                                <SortableContext items={filteredRows.map(row => row.id)} strategy={verticalListSortingStrategy}>
                                                    {filteredRows.map((row) => (
                                                        <SortableRow
                                                            key={row.id}
                                                            row={row}
                                                            phonebookSchema={phonebookSchema}
                                                            isPhonebookEditMode={isPhonebookEditMode}
                                                            updatePhonebookCell={updatePhonebookCell}
                                                            deletePhonebookRow={deletePhonebookRow}
                                                        />
                                                    ))}
                                                </SortableContext>
                                            </DndContext>
                                        );
                                    })()}
                                </tbody>
                            </table>
                        </div>


                        {isPhonebookEditMode && (
                            <div className="p-8 border-t border-amber-50 flex justify-center bg-amber-50/30">
                                <button onClick={addPhonebookRow} className="flex items-center gap-3 cursor-pointer text-white font-black bg-slate-900 px-12 py-5 rounded-[2rem] hover:bg-amber-500 hover:scale-105 transition-all shadow-2xl">
                                    <Plus size={24} /> הוסף עובד חדש
                                </button>
                            </div>
                        )}
                    </div>
                </div>


                {isEditMode && (
                    <div className="text-center mt-24 pt-12 border-t border-slate-200">
                        <button onClick={() => { setShowCreateSectionModal(true); setNewSectionFields([{ key: 'f_title', label: 'כותרת ראשית (חובה)', type: 'text' }]); }} className="bg-slate-900 text-white px-12 py-6 rounded-3xl font-black text-xl cursor-pointer shadow-xl hover:scale-105 transition-transform flex items-center gap-4 mx-auto">
                            <Plus size={28} /> צור קטגוריה חדשה
                        </button>
                        <p className="text-slate-400 mt-4 text-base font-medium">הגדר איזה שדות ונתונים יהיו בקטגוריה החדשה</p>
                    </div>
                )}
            </main>

            {/* --- MODAL 1: צפייה בפרטים --- */}
            {viewItem && (() => {
                const colors = getColorClasses(viewItem.section.color);
                return (
                    <div
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-6 animate-in fade-in duration-200"
                        onClick={() => setViewItem(null)} // 👈 סגירה בלחיצה בחוץ
                    >
                        <div
                            className="bg-white rounded-[2.5rem] w-full max-w-3xl shadow-2xl relative border border-gray-100 max-h-[90vh] overflow-y-auto"
                            onClick={(e) => e.stopPropagation()} // 👈 מניעת סגירה בלחיצה בפנים
                        >
                            {/* ... המשך הקוד הקיים ... */}
                            <button onClick={() => setViewItem(null)} className="absolute top-8 left-8 text-slate-400 cursor-pointer hover:text-slate-600 bg-slate-50 p-3 rounded-full hover:bg-slate-100 transition"><X size={28} /></button>

                            <div className="p-10 pb-6 border-b border-slate-100">
                                {/* כותרת ראשית */}
                                <h2 className={`text-5xl font-black ${colors.text} mb-3`}>{viewItem.item.data[viewItem.section.schema[0].key]}</h2>

                                {/* תיקון 1: הצגת כותרת משנה רק אם יש בה תוכן אמיתי */}
                                {viewItem.section.schema[1] &&
                                    viewItem.section.schema[1].type === 'text' &&
                                    viewItem.item.data[viewItem.section.schema[1].key] && (
                                        <p className="text-2xl font-bold text-slate-500">{viewItem.item.data[viewItem.section.schema[1].key]}</p>
                                    )}
                            </div>

                            <div className="p-10 space-y-8">
                                {/* --- התחלת הלולאה הבטוחה (BULLETPROOF LOOP) --- */}
                                {viewItem.section.schema.slice(viewItem.section.schema[1]?.type === 'text' ? 2 : 1).map((field: any) => {
                                    const rawVal = viewItem.item.data[field.key];

                                    // הגנה 1: אם אין ערך בכלל, מדלגים
                                    if (rawVal === undefined || rawVal === null || rawVal === '') return null;

                                    // הגנה 2: זיהוי סוג המידע האמיתי (לא משנה מה כתוב בסכמה)
                                    const isArray = Array.isArray(rawVal);
                                    const isObject = typeof rawVal === 'object' && !isArray && rawVal !== null;
                                    const isString = typeof rawVal === 'string' || typeof rawVal === 'number';

                                    // בדיקה מיוחדת: האם זה נראה כמו שורת ספר טלפונים? (לפי התקלה שלך)
                                    const isPhoneRow = isObject && 'name' in rawVal && 'role' in rawVal;
                                    // אם בטעות קיבלנו שורה בודדת במקום מערך, או סתם אובייקט במקום טקסט - לא מציגים כדי למנוע קריסה
                                    if (isPhoneRow || (field.type === 'text' && !isString)) {
                                        return null;
                                    }

                                    return (
                                        <div key={field.key} className="mb-6">
                                            <div className="flex items-center gap-3 mb-3">
                                                <span className={`text-sm font-black uppercase tracking-wider ${colors.text} opacity-80`}>{field.label}</span>
                                                <div className="h-px flex-1 bg-slate-100"></div>
                                            </div>

                                            {/* --- טקסט רגיל (מוצג רק אם המידע הוא באמת טקסט!) --- */}
                                            {field.type === 'text' && isString && (
                                                <p className="text-xl font-medium text-slate-800 leading-relaxed">{rawVal}</p>
                                            )}

                                            {/* --- טקסט ארוך --- */}
                                            {field.type === 'textarea' && isString && (
                                                <div className="bg-slate-50 p-6 rounded-3xl text-lg text-slate-700 whitespace-pre-line leading-loose border border-slate-100">{rawVal}</div>
                                            )}

                                            {/* --- קישור --- */}
                                            {field.type === 'link' && isString && (
                                                <a href={rawVal as string} target="_blank" rel="noopener noreferrer" className={`flex items-center gap-4 font-bold text-lg ${colors.text} hover:underline bg-${viewItem.section.color}-50 p-4 rounded-2xl transition-colors dir-ltr w-fit`}>
                                                    <ExternalLink size={24} /> <span>{rawVal}</span>
                                                </a>
                                            )}

                                            {/* --- קבצים --- */}
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

                                            {/* --- סיסמאות --- */}
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

                                            {/* --- ספר טלפונים (מטפל במקרה של מערך תקין) --- */}
                                            {field.type === 'phonebook' && isArray && rawVal.length > 0 && (
                                                <div className="overflow-hidden rounded-2xl border border-slate-200 shadow-sm">
                                                    <table className="w-full text-right text-sm">
                                                        <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider">
                                                            <tr>
                                                                <th className="px-6 py-4">שם העובד</th>
                                                                <th className="px-6 py-4">תפקיד</th>
                                                                <th className="px-6 py-4">טלפון אישי</th>
                                                                <th className="px-6 py-4">שלוחה</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className="divide-y divide-slate-100 bg-white">
                                                            {rawVal.map((row: any, i: number) => (
                                                                <tr key={i} className="hover:bg-slate-50 transition-colors">
                                                                    {/* הגנה נוספת: וידוא שכל תא בטבלה הוא טקסט תקין ולא אובייקט */}
                                                                    <td className="px-6 py-4 font-bold text-slate-800">{typeof row.name === 'string' ? row.name : ''}</td>
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

            {/* --- MODAL 2: בונה הקטגוריות (עם DND) --- */}
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

                                <DndContext
                                    sensors={sensors}
                                    collisionDetection={closestCenter}
                                    onDragEnd={handleDragEnd}
                                >
                                    <SortableContext
                                        items={newSectionFields.map(f => f.key)}
                                        strategy={verticalListSortingStrategy}
                                    >
                                        <div className="space-y-4">
                                            {newSectionFields.map((field, idx) => (
                                                <SortableField
                                                    key={field.key}
                                                    field={field}
                                                    idx={idx}
                                                    updateFieldInSchema={updateFieldInSchema}
                                                    removeFieldFromSchema={removeFieldFromSchema}
                                                />
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

            {/* --- MODAL 3: הוספת/עריכת פריט --- */}
            {showAddItemModal && targetSection && (() => {
                const colors = getColorClasses(targetSection.color);
                return (
                    <div
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
                        onClick={() => { // ✅ סגירה ואיפוס בלחיצה בחוץ
                            setShowAddItemModal(false);
                            setEditingItemId(null);
                            setNewItemData({});
                        }}
                    >
                        <div
                            className="bg-white rounded-[2.5rem] w-full max-w-xl shadow-2xl p-10 relative"
                            onClick={(e) => e.stopPropagation()} // ✅ מניעת סגירה בלחיצה בפנים
                        >
                            <button onClick={() => { setShowAddItemModal(false); setEditingItemId(null); setNewItemData({}); }} className="absolute top-8 left-8 cursor-pointer text-slate-400 hover:text-slate-600"><X size={28} /></button>
                            <h2 className="text-3xl font-black mb-8 pr-4">
                                {editingItemId ? 'עריכת פריט ב' : 'הוסף פריט ל'}
                                <span className={colors.text}> {targetSection.title}</span>
                            </h2>

                            <div className="space-y-6 max-h-[60vh] overflow-y-auto px-1">
                                {targetSection.schema.map((field: any, idx: number) => (
                                    <div key={field.key}>
                                        <label className="block text-sm font-bold text-slate-400 uppercase mb-2">{field.label}</label>

                                        {field.type === 'text' && (
                                            <input className={`w-full border border-slate-200 rounded-2xl p-4 outline-none focus:border-slate-500 focus:ring-4 focus:ring-slate-100 transition-all ${idx === 0 ? 'text-xl font-bold' : ''}`}
                                                placeholder={idx === 0 ? `הכנס ${field.label}...` : ''}
                                                value={newItemData[field.key] || ''}
                                                onChange={e => setNewItemData({ ...newItemData, [field.key]: e.target.value })}
                                            />
                                        )}
                                        {field.type === 'textarea' && (
                                            <textarea rows={4} className="w-full border border-slate-200 rounded-2xl p-4 outline-none focus:border-slate-500 focus:ring-4 focus:ring-slate-100 transition-all text-lg"
                                                value={newItemData[field.key] || ''}
                                                onChange={e => setNewItemData({ ...newItemData, [field.key]: e.target.value })}
                                            />
                                        )}
                                        {field.type === 'link' && (
                                            <div className="relative">
                                                <div className="absolute top-4 right-4 text-slate-400 pointer-events-none"><LinkIcon size={20} /></div>
                                                <input className="w-full border border-slate-200 rounded-2xl p-4 pr-12 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-50 text-left dir-ltr transition-all font-mono text-base"
                                                    placeholder="https://..."
                                                    value={newItemData[field.key] || ''}
                                                    onChange={e => setNewItemData({ ...newItemData, [field.key]: e.target.value })}
                                                />
                                            </div>
                                        )}
                                        {/* העלאת קבצים מרובים */}
                                        {field.type === 'file' && (
                                            <div className="space-y-3">
                                                <label className={`flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-2xl cursor-pointer hover:bg-slate-50 transition-colors border-slate-300`}>
                                                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                                        <Upload size={24} className="text-slate-400" />
                                                        <p className="mb-2 text-sm text-slate-500 font-bold mt-2">לחץ להעלאת קבצים</p>
                                                    </div>
                                                    <input type="file" multiple className="hidden" onChange={(e) => handleFileSelect(e, field.key)} />
                                                </label>

                                                {/* רשימת קבצים שנבחרו למחיקה */}
                                                {Array.isArray(newItemData[field.key]) && newItemData[field.key].length > 0 && (
                                                    <div className="grid grid-cols-1 gap-2">
                                                        {newItemData[field.key].map((f: any, i: number) => (
                                                            <div key={i} className="flex justify-between items-center bg-slate-50 p-3 rounded-xl border border-slate-200">
                                                                <div className="flex items-center gap-2 overflow-hidden">
                                                                    <File size={16} className="text-slate-400 shrink-0" />
                                                                    <span className="text-sm font-bold text-slate-700 truncate">{f.name}</span>
                                                                </div>
                                                                <button onClick={() => handleRemoveFile(field.key, i)} className="text-slate-300 cursor-pointer hover:text-red-500 p-1"><X size={18} /></button>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                        {field.type === 'password' && (
                                            <div className="bg-amber-50 p-4 rounded-2xl border border-amber-100 grid grid-cols-2 gap-4">
                                                <input className="w-full border border-amber-200 rounded-xl p-3 outline-none text-base bg-white" placeholder="שם משתמש"
                                                    value={newItemData[field.key]?.username || ''}
                                                    onChange={e => setNewItemData({ ...newItemData, [field.key]: { ...newItemData[field.key], username: e.target.value } })}
                                                />
                                                <input className="w-full border border-amber-200 rounded-xl p-3 outline-none text-base bg-white" placeholder="סיסמה"
                                                    value={newItemData[field.key]?.password || ''}
                                                    onChange={e => setNewItemData({ ...newItemData, [field.key]: { ...newItemData[field.key], password: e.target.value } })}
                                                    onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                                                />
                                            </div>
                                        )}
                                        {/* --- שדה ספר טלפונים (עריכה) --- */}
                                        {field.type === 'phonebook' && (() => {
                                            const rows = Array.isArray(newItemData[field.key]) ? newItemData[field.key] : [];

                                            const updateRow = (index: number, fieldName: string, val: string) => {
                                                const newRows = [...rows];
                                                newRows[index] = { ...newRows[index], [fieldName]: val };
                                                setNewItemData({ ...newItemData, [field.key]: newRows });
                                            };

                                            const addRow = () => {
                                                setNewItemData({ ...newItemData, [field.key]: [...rows, { name: '', role: '', phone: '', ext: '' }] });
                                            };

                                            const removeRow = (index: number) => {
                                                const newRows = rows.filter((_: any, i: number) => i !== index);
                                                setNewItemData({ ...newItemData, [field.key]: newRows });
                                            };

                                            return (
                                                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                                                    <div className="space-y-3">
                                                        {rows.map((row: any, i: number) => (
                                                            <div key={i} className="flex gap-2 items-center bg-white p-2 rounded-xl border border-slate-100 shadow-sm">
                                                                <div className="bg-slate-100 w-8 h-8 flex items-center justify-center rounded-full text-xs font-bold shrink-0">{i + 1}</div>
                                                                <input placeholder="שם מלא" className="w-1/4 p-2 bg-transparent outline-none border-b border-transparent focus:border-blue-500 text-sm" value={row.name} onChange={e => updateRow(i, 'name', e.target.value)} />
                                                                <div className="w-px h-6 bg-slate-100"></div>
                                                                <input placeholder="תפקיד" className="w-1/4 p-2 bg-transparent outline-none border-b border-transparent focus:border-blue-500 text-sm" value={row.role} onChange={e => updateRow(i, 'role', e.target.value)} />
                                                                <div className="w-px h-6 bg-slate-100"></div>
                                                                <input placeholder="נייד" className="w-1/4 p-2 bg-transparent outline-none border-b border-transparent focus:border-blue-500 text-sm" value={row.phone} onChange={e => updateRow(i, 'phone', e.target.value)} />
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

            {/* LOGIN MODAL */}
            {showLoginModal && (
                <div
                    className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60]"
                    onClick={() => setShowLoginModal(false)} // 👈 1. זה סוגר כשלוחצים על הרקע
                >
                    <div
                        className="bg-white p-10 rounded-[2.5rem] w-96 text-center shadow-2xl"
                        onClick={(e) => e.stopPropagation()} // 👈 2. זה מונע סגירה כשלוחצים בתוך החלון הלבן
                    >
                        {/* ... כאן נמצא הטופס שלך ... */}
                        <h3 className="font-bold text-2xl mb-8">כניסה למערכת</h3>

                        {/* ✅ הוספנו FORM כדי שה-ENTER יעבוד אוטומטית */}
                        <form onSubmit={(e) => { e.preventDefault(); handleLogin(); }}>

                            <input
                                className="w-full border bg-slate-50 p-4 mb-3 rounded-2xl outline-none focus:border-red-500 text-lg"
                                placeholder="שם משתמש"
                                value={loginCredentials.username}
                                onChange={e => setLoginCredentials({ ...loginCredentials, username: e.target.value })}
                                autoFocus // הוספנו פוקוס אוטומטי לנוחות
                            />

                            <input
                                className="w-full border bg-slate-50 p-4 mb-8 rounded-2xl outline-none focus:border-red-500 text-lg"
                                type="password"
                                placeholder="סיסמה"
                                value={loginCredentials.password}
                                onChange={e => setLoginCredentials({ ...loginCredentials, password: e.target.value })}
                            />

                            <button
                                type="submit"
                                className="bg-slate-900 text-white px-6 py-4 rounded-2xl w-full font-bold text-lg 
                    hover:bg-slate-700 hover:scale-[1.02] cursor-pointer active:scale-95 transition-all shadow-lg hover:shadow-slate-500/30"
                            >
                                התחבר
                            </button>

                        </form>

                        <button onClick={() => setShowLoginModal(false)} className="text-sm text-slate-400 mt-6 cursor-pointer hover:text-slate-600">ביטול</button>
                    </div>
                </div>
            )}

            {/* --- SECURITY CHECK MODAL --- */}
            {showSecurityModal && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[70] backdrop-blur-sm" onClick={() => setShowSecurityModal(false)}>
                    <div className="bg-white p-8 rounded-3xl w-80 text-center shadow-2xl border border-slate-100 animate-in zoom-in duration-200" onClick={(e) => e.stopPropagation()}>
                        <div className="bg-amber-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 text-amber-600">
                            <Lock size={32} />
                        </div>
                        <h3 className="font-black text-xl mb-2 text-slate-800">בדיקת אבטחה</h3>
                        <p className="text-slate-500 text-sm mb-6 font-medium">נא להזין סיסמה לצפייה/העתקה</p>

                        <form onSubmit={handleSecurityVerify}>
                            <input
                                type="password"
                                className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl mb-4 outline-none focus:border-amber-500 focus:ring-4 focus:ring-amber-100 text-center font-bold text-lg tracking-widest"
                                placeholder="******"
                                value={securityInput}
                                onChange={e => setSecurityInput(e.target.value)}
                                autoFocus
                            />
                            <button type="submit" className="bg-slate-900 text-white w-full py-3 rounded-xl font-bold hover:bg-slate-800 transition-all shadow-lg shadow-slate-200">
                                אישור
                            </button>
                        </form>
                        <button onClick={() => setShowSecurityModal(false)} className="mt-4 text-sm text-slate-400 font-bold hover:text-slate-600">ביטול</button>
                    </div>
                </div>
            )}

        </div>
    );
}