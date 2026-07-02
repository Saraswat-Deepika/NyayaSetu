import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
    getHistory, deleteHistory, toggleFavorite, 
    updateHistory, recordOpen, restoreHistory, emptyTrash 
} from '../services/api';
import { 
    FileText, Search, Calendar, Clock, Globe, Trash2, 
    Play, Download, Star, Loader2, X, Pin, RotateCcw,
    Edit2, Share2, SlidersHorizontal, Check, Scale, ArrowUpDown,
    MessageSquare, Sparkles, Filter, Eye, ChevronDown, ChevronRight, Plus
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// Format bytes helper
const formatBytes = (bytes, decimals = 2) => {
    if (!bytes || isNaN(bytes) || bytes <= 0) return '0 MB';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    if (i < 0) return '0 Bytes';
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

const DocumentHistoryPage = () => {
    const navigate = useNavigate();
    const loadMoreRef = useRef(null);

    // List & Pagination State
    const [documents, setDocuments] = useState([]);
    const [stats, setStats] = useState({ 
        totalDocs: 0, 
        totalSize: 0, 
        maxDocs: 1000, 
        maxSize: 5120 * 1024 * 1024,
        largestDoc: null,
        lastUploaded: null
    });
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [isLoading, setIsLoading] = useState(true);
    const [isInfiniteLoading, setIsInfiniteLoading] = useState(false);

    // Search, Sort, Filter States
    const [searchQuery, setSearchQuery] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [sortBy, setSortBy] = useState('Recent');
    const [activeFilters, setActiveFilters] = useState(['All']);
    const [recentSearches, setRecentSearches] = useState(() => {
        try {
            return JSON.parse(localStorage.getItem('recentSearches') || '[]');
        } catch {
            return [];
        }
    });

    // Advanced Filters Panel State
    const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);
    const [advancedFilters, setAdvancedFilters] = useState({
        uploadDateStart: '',
        uploadDateEnd: '',
        court: '',
        judge: '',
        language: '',
        documentType: '',
        tags: '',
        minSize: '',
        maxSize: ''
    });

    // Inline Renaming & Note States
    const [editingDocId, setEditingDocId] = useState(null);
    const [renameValue, setRenameValue] = useState('');
    const [editingNotesDocId, setEditingNotesDocId] = useState(null);
    const [notesValue, setNotesValue] = useState('');

    // Hover & Previews State
    const [hoveredDoc, setHoveredDoc] = useState(null);
    const [hoveredDocPosition, setHoveredDocPosition] = useState({ x: 0, y: 0 });
    
    // UI Collapsible Groups
    const [collapsedGroups, setCollapsedGroups] = useState({});

    // Bulk Action Selection
    const [selectedDocs, setSelectedDocs] = useState(new Set());

    // Keyboard navigation focus
    const [keyboardActiveId, setKeyboardActiveId] = useState(null);

    // Modals
    const [docToDelete, setDocToDelete] = useState(null);
    const [isPermanentDelete, setIsPermanentDelete] = useState(false);

    // Search input focus ref
    const searchInputRef = useRef(null);

    // Swipe gestures on mobile
    const touchStart = useRef({ x: 0, y: 0 });

    // Is current view showing Trash bin
    const isTrashView = activeFilters.includes('Trash');

    // 1. Search Debounce (300ms)
    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedSearch(searchQuery);
            setPage(1);
        }, 300);
        return () => clearTimeout(handler);
    }, [searchQuery]);

    // Save recent searches
    const addRecentSearch = (query) => {
        if (!query.trim()) return;
        setRecentSearches(prev => {
            const filtered = prev.filter(s => s !== query);
            const updated = [query, ...filtered].slice(0, 5);
            localStorage.setItem('recentSearches', JSON.stringify(updated));
            return updated;
        });
    };

    // 2. Fetch logic combining filters, sorts, advanced search
    const fetchDocs = async (pageNum, isAppend = false) => {
        if (pageNum === 1) setIsLoading(true);
        else setIsInfiniteLoading(true);

        try {
            // Build query params
            const filterParam = activeFilters.includes('All') ? 'All' : activeFilters.join(',');
            
            const params = {
                page: pageNum,
                limit: 30,
                sortBy,
                filter: filterParam,
                search: debouncedSearch,
                ...advancedFilters
            };

            const data = await getHistory(params);
            
            if (isAppend) {
                setDocuments(prev => {
                    const existingIds = new Set(prev.map(d => d._id));
                    const newDocs = (data.documents || []).filter(d => !existingIds.has(d._id));
                    return [...prev, ...newDocs];
                });
            } else {
                setDocuments(data.documents || []);
            }

            setStats(data.stats || { 
                totalDocs: 0, 
                totalSize: 0, 
                maxDocs: 1000, 
                maxSize: 5120 * 1024 * 1024,
                largestDoc: null,
                lastUploaded: null
            });
            setHasMore(pageNum < (data.pages || 1));
        } catch (error) {
            console.error("Failed to load documents:", error);
        } finally {
            setIsLoading(false);
            setIsInfiniteLoading(false);
        }
    };

    // Trigger fetch on query parameters change
    useEffect(() => {
        fetchDocs(1, false);
    }, [page, sortBy, activeFilters, debouncedSearch, advancedFilters]);

    // 3. Infinite scroll observer setup
    useEffect(() => {
        const observer = new IntersectionObserver((entries) => {
            if (entries[0].isIntersecting && hasMore && !isLoading && !isInfiniteLoading) {
                setPage(prev => prev + 1);
                fetchDocs(page + 1, true);
            }
        }, { threshold: 0.1 });

        if (loadMoreRef.current) {
            observer.observe(loadMoreRef.current);
        }

        return () => observer.disconnect();
    }, [hasMore, isLoading, isInfiniteLoading, page]);

    // 4. Keyboard Shortcuts handler
    useEffect(() => {
        const handleKeyDown = (e) => {
            // Ctrl + K to focus search
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
                e.preventDefault();
                searchInputRef.current?.focus();
                return;
            }

            // If user is editing a text input, skip list navigation shortcuts
            if (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA') {
                return;
            }

            const visibleDocs = flattenedVisibleDocs;
            if (visibleDocs.length === 0) return;

            const currentIndex = visibleDocs.findIndex(d => d._id === keyboardActiveId);

            switch (e.key) {
                case 'ArrowDown':
                    e.preventDefault();
                    if (currentIndex === -1) {
                        setKeyboardActiveId(visibleDocs[0]._id);
                    } else if (currentIndex < visibleDocs.length - 1) {
                        setKeyboardActiveId(visibleDocs[currentIndex + 1]._id);
                    }
                    break;
                case 'ArrowUp':
                    e.preventDefault();
                    if (currentIndex > 0) {
                        setKeyboardActiveId(visibleDocs[currentIndex - 1]._id);
                    }
                    break;
                case 'Enter':
                    if (currentIndex !== -1) {
                        e.preventDefault();
                        if (visibleDocs[currentIndex].deleted) {
                            handleRestore(e, visibleDocs[currentIndex]);
                        } else {
                            handleOpenDocument(visibleDocs[currentIndex]._id);
                        }
                    }
                    break;
                case 'Delete':
                    if (currentIndex !== -1) {
                        e.preventDefault();
                        initiateDelete(e, visibleDocs[currentIndex]);
                    }
                    break;
                case 'Escape':
                    e.preventDefault();
                    setHoveredDoc(null);
                    setKeyboardActiveId(null);
                    setSelectedDocs(new Set());
                    break;
                default:
                    break;
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [keyboardActiveId, documents]);

    // 5. Scroll active keyboard row into view
    useEffect(() => {
        if (keyboardActiveId) {
            const el = document.getElementById(`doc-row-${keyboardActiveId}`);
            el?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        }
    }, [keyboardActiveId]);

    // Navigation and single modifications
    const handleOpenDocument = async (id) => {
        try {
            await recordOpen(id);
        } catch (err) {
            console.warn("Failed to record open event:", err);
        }
        navigate(`/dashboard/documents/${id}`);
    };

    const handleFavoriteToggle = async (e, doc) => {
        e.stopPropagation();
        try {
            const result = await toggleFavorite(doc._id);
            setDocuments(prev => prev.map(d => d._id === doc._id ? { ...d, favorite: result.favorite } : d));
        } catch (error) {
            console.error("Favorite toggle failed:", error);
        }
    };

    const handlePinToggle = async (e, doc) => {
        e.stopPropagation();
        try {
            const nextPinnedState = !doc.pinned;
            await updateHistory(doc._id, { pinned: nextPinnedState });
            setDocuments(prev => prev.map(d => d._id === doc._id ? { ...d, pinned: nextPinnedState } : d));
        } catch (error) {
            console.error("Pin toggle failed:", error);
        }
    };

    const startRename = (e, doc) => {
        e.stopPropagation();
        setEditingDocId(doc._id);
        setRenameValue(doc.documentName || doc.originalName);
    };

    const handleRenameConfirm = async (id, newName) => {
        if (!newName.trim()) {
            setEditingDocId(null);
            return;
        }
        try {
            await updateHistory(id, { documentName: newName.trim() });
            setDocuments(prev => prev.map(d => d._id === id ? { ...d, documentName: newName.trim() } : d));
        } catch (error) {
            console.error("Rename failed:", error);
        } finally {
            setEditingDocId(null);
        }
    };

    const startNotes = (e, doc) => {
        e.stopPropagation();
        setEditingNotesDocId(doc._id);
        setNotesValue(doc.notes || '');
    };

    const handleNotesConfirm = async (id, notesVal) => {
        try {
            await updateHistory(id, { notes: notesVal.trim() });
            setDocuments(prev => prev.map(d => d._id === id ? { ...d, notes: notesVal.trim() } : d));
        } catch (error) {
            console.error("Notes update failed:", error);
        } finally {
            setEditingNotesDocId(null);
        }
    };

    // Soft delete / permanent delete
    const initiateDelete = (e, doc) => {
        e.stopPropagation();
        setDocToDelete(doc);
        setIsPermanentDelete(!!doc.deleted);
    };

    const handleDeleteConfirm = async () => {
        if (!docToDelete) return;
        try {
            const result = await deleteHistory(docToDelete._id, isPermanentDelete);
            
            // Remove from local list
            setDocuments(prev => prev.filter(d => d._id !== docToDelete._id));
            
            // Adjust storage stats dynamically
            if (isPermanentDelete || result.permanent) {
                // Permanently deleted, decrement stats
                setStats(prev => ({
                    ...prev,
                    totalDocs: Math.max(prev.totalDocs - 1, 0),
                    totalSize: Math.max(prev.totalSize - (docToDelete.fileSize || 0), 0)
                }));
            } else {
                // Soft-deleted to Trash, docs statistics decrement immediately for storage used
                setStats(prev => ({
                    ...prev,
                    totalDocs: Math.max(prev.totalDocs - 1, 0),
                    totalSize: Math.max(prev.totalSize - (docToDelete.fileSize || 0), 0)
                }));
            }
            
            setDocToDelete(null);
            fetchDocs(1, false);
        } catch (error) {
            console.error("Failed to delete record:", error);
            alert("Could not delete document.");
        }
    };

    // Restore from trash
    const handleRestore = async (e, doc) => {
        e.stopPropagation();
        try {
            await restoreHistory(doc._id);
            // Remove from current trash view list
            setDocuments(prev => prev.filter(d => d._id !== doc._id));
            fetchDocs(1, false);
        } catch (error) {
            console.error("Restore failed:", error);
            alert("Could not restore document.");
        }
    };

    // Empty Trash
    const handleEmptyTrash = async () => {
        if (window.confirm("Are you sure you want to permanently empty all items in your Trash? This cannot be undone.")) {
            try {
                await emptyTrash();
                setDocuments([]);
                fetchDocs(1, false);
                alert("Trash emptied successfully.");
            } catch (err) {
                console.error("Failed to empty trash:", err);
                alert("Failed to empty trash.");
            }
        }
    };

    // Download extracted text
    const handleDownload = (e, doc) => {
        e.stopPropagation();
        const element = document.createElement("a");
        const fileContent = doc.extractedText || "No text extracted.";
        const textBlob = new Blob([fileContent], { type: 'text/plain;charset=utf-8' });
        element.href = URL.createObjectURL(textBlob);
        element.download = `${doc.documentName || 'Document'}_extracted_text.txt`;
        document.body.appendChild(element);
        element.click();
        document.body.removeChild(element);
    };

    // Advanced search inputs
    const handleAdvancedSearchChange = (e) => {
        const { name, value } = e.target;
        setAdvancedFilters(prev => ({ ...prev, [name]: value }));
    };

    const resetAdvancedFilters = () => {
        setAdvancedFilters({
            uploadDateStart: '',
            uploadDateEnd: '',
            court: '',
            judge: '',
            language: '',
            documentType: '',
            tags: '',
            minSize: '',
            maxSize: ''
        });
        setIsAdvancedOpen(false);
    };

    // Filter Chips toggling
    const handleFilterChipClick = (value) => {
        setPage(1);
        if (value === 'All') {
            setActiveFilters(['All']);
            return;
        }
        if (value === 'Trash') {
            setActiveFilters(['Trash']);
            return;
        }

        setActiveFilters(prev => {
            const next = prev.filter(f => f !== 'All' && f !== 'Trash');
            if (next.includes(value)) {
                const filtered = next.filter(f => f !== value);
                return filtered.length === 0 ? ['All'] : filtered;
            } else {
                return [...next, value];
            }
        });
    };

    // Bulk actions
    const toggleSelectDoc = (e, id) => {
        e.stopPropagation();
        setSelectedDocs(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const handleBulkDownload = () => {
        const selectedIds = Array.from(selectedDocs);
        const docs = documents.filter(d => selectedIds.includes(d._id));
        docs.forEach((doc, idx) => {
            setTimeout(() => {
                const element = document.createElement("a");
                const fileContent = doc.extractedText || "No text extracted.";
                const textBlob = new Blob([fileContent], { type: 'text/plain;charset=utf-8' });
                element.href = URL.createObjectURL(textBlob);
                element.download = `${doc.documentName || 'Document'}_extracted_text.txt`;
                document.body.appendChild(element);
                element.click();
                document.body.removeChild(element);
            }, idx * 250);
        });
        setSelectedDocs(new Set());
    };

    const handleBulkDelete = async () => {
        const selectedIds = Array.from(selectedDocs);
        const msg = isTrashView 
            ? `Are you sure you want to PERMANENTLY delete these ${selectedIds.length} documents? This action is irreversible.` 
            : `Move these ${selectedIds.length} documents to Trash?`;
            
        if (window.confirm(msg)) {
            try {
                await Promise.all(selectedIds.map(id => deleteHistory(id, isTrashView)));
                
                const deletedSizes = documents
                    .filter(d => selectedIds.includes(d._id))
                    .reduce((sum, d) => sum + (d.fileSize || 0), 0);
                
                setDocuments(prev => prev.filter(d => !selectedIds.includes(d._id)));
                setSelectedDocs(new Set());
                fetchDocs(1, false);
            } catch (err) {
                console.error("Bulk delete failed:", err);
                alert("Bulk delete operations failed.");
            }
        }
    };

    const handleBulkRestore = async () => {
        const selectedIds = Array.from(selectedDocs);
        if (window.confirm(`Restore these ${selectedIds.length} documents from Trash?`)) {
            try {
                await Promise.all(selectedIds.map(id => restoreHistory(id)));
                const restoredDocs = documents.filter(d => selectedIds.includes(d._id));
                const restoredSize = restoredDocs.reduce((sum, d) => sum + (d.fileSize || 0), 0);
                
                setDocuments(prev => prev.filter(d => !selectedIds.includes(d._id)));
                setSelectedDocs(new Set());
                fetchDocs(1, false);
            } catch (err) {
                console.error("Bulk restore failed:", err);
                alert("Bulk restore failed.");
            }
        }
    };

    // Hover previews position math
    const handleRowHoverEnter = (e, doc) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const parentRect = e.currentTarget.offsetParent?.getBoundingClientRect() || { top: 0, left: 0 };
        
        setHoveredDoc(doc);
        setHoveredDocPosition({
            x: rect.left - parentRect.left + rect.width - 290,
            y: rect.top - parentRect.top - 20
        });
    };

    const handleRowHoverLeave = () => {
        setHoveredDoc(null);
    };

    // Mobile Swipe Handler
    const handleTouchStart = (e, doc) => {
        touchStart.current = {
            x: e.touches[0].clientX,
            y: e.touches[0].clientY,
            doc
        };
    };

    const handleTouchMove = (e) => {
        // Track touch displacements
    };

    const handleTouchEnd = (e) => {
        const diffX = e.changedTouches[0].clientX - touchStart.current.x;
        const diffY = e.changedTouches[0].clientY - touchStart.current.y;
        
        // Prevent trigger on vertical scrolling
        if (Math.abs(diffY) > 50) return;

        const doc = touchStart.current.doc;
        if (!doc) return;

        if (diffX > 100) {
            // Swipe Right -> Restore (in Trash) or Favorite (in standard list)
            if (doc.deleted) {
                handleRestore(e, doc);
            } else {
                handleFavoriteToggle(e, doc);
            }
        } else if (diffX < -100) {
            // Swipe Left -> Delete
            initiateDelete(e, doc);
        }
    };

    // 6. Dynamic Grouping Algorithm
    const groupedDocuments = useMemo(() => {
        const groups = {
            pinned: [],
            favorites: [],
            recentlyOpened: [],
            today: [],
            yesterday: [],
            previous7: [],
            previous30: [],
            months: {},
            older: []
        };

        const now = new Date();
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const yesterdayStart = new Date(todayStart.getTime() - 24 * 60 * 60 * 1000);
        const sevenDaysAgo = new Date(todayStart.getTime() - 7 * 24 * 60 * 60 * 1000);
        const thirtyDaysAgo = new Date(todayStart.getTime() - 30 * 24 * 60 * 60 * 1000);

        documents.forEach(doc => {
            if (doc.pinned) {
                groups.pinned.push(doc);
                return;
            }

            if (doc.favorite) {
                groups.favorites.push(doc);
                return;
            }

            const date = new Date(doc.uploadDate || doc.createdAt);

            if (date >= todayStart) {
                groups.today.push(doc);
            } else if (date >= yesterdayStart) {
                groups.yesterday.push(doc);
            } else if (date >= sevenDaysAgo) {
                groups.previous7.push(doc);
            } else if (date >= thirtyDaysAgo) {
                groups.previous30.push(doc);
            } else {
                const monthNames = [
                    "January", "February", "March", "April", "May", "June",
                    "July", "August", "September", "October", "November", "December"
                ];
                const key = `${monthNames[date.getMonth()]} ${date.getFullYear()}`;
                
                // If it is this year, put in month group, otherwise group as Older
                if (date.getFullYear() === now.getFullYear()) {
                    if (!groups.months[key]) {
                        groups.months[key] = [];
                    }
                    groups.months[key].push(doc);
                } else {
                    groups.older.push(doc);
                }
            }
        });

        // Populate Recently Opened (last opened in last 7 days)
        const recentThreshold = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        groups.recentlyOpened = documents
            .filter(doc => !doc.pinned && new Date(doc.lastOpened || doc.updatedAt) >= recentThreshold)
            .sort((a, b) => new Date(b.lastOpened || b.updatedAt) - new Date(a.lastOpened || a.updatedAt))
            .slice(0, 5);

        return groups;
    }, [documents]);

    // Flatten visible items for keyboard navigation index calculation
    const flattenedVisibleDocs = useMemo(() => {
        const list = [];
        const addToFlat = (groupDocs, name) => {
            if (collapsedGroups[name]) return;
            list.push(...groupDocs);
        };

        addToFlat(groupedDocuments.pinned, 'pinned');
        addToFlat(groupedDocuments.favorites, 'favorites');
        
        // Exclude recentlyOpened if we don't want duplicates navigateable in list
        addToFlat(groupedDocuments.today, 'today');
        addToFlat(groupedDocuments.yesterday, 'yesterday');
        addToFlat(groupedDocuments.previous7, 'previous7');
        addToFlat(groupedDocuments.previous30, 'previous30');
        
        Object.keys(groupedDocuments.months).sort().reverse().forEach(key => {
            addToFlat(groupedDocuments.months[key], key);
        });

        addToFlat(groupedDocuments.older, 'older');
        return list;
    }, [groupedDocuments, collapsedGroups]);

    // Document types Badge styling
    const getBadgeStyle = (type) => {
        const cleanType = (type || '').toLowerCase();
        if (cleanType.includes('supreme court')) return 'bg-rose-50 text-rose-700 border-rose-100 dark:bg-rose-950/20 dark:text-rose-400';
        if (cleanType.includes('high court')) return 'bg-amber-50 text-amber-700 border-amber-100 dark:bg-amber-950/20 dark:text-amber-400';
        if (cleanType.includes('court order') || cleanType.includes('order')) return 'bg-blue-50 text-blue-700 border-blue-100 dark:bg-blue-950/20 dark:text-blue-400';
        if (cleanType.includes('judgment') || cleanType.includes('judgement')) return 'bg-rose-50 text-rose-700 border-rose-100 dark:bg-rose-950/20 dark:text-rose-400';
        if (cleanType.includes('act')) return 'bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-950/20 dark:text-emerald-400';
        if (cleanType.includes('contract') || cleanType.includes('agreement')) return 'bg-indigo-50 text-indigo-700 border-indigo-100 dark:bg-indigo-950/20 dark:text-indigo-400';
        return 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300';
    };

    // Section Toggle UI Header
    const renderSectionHeader = (title, count, collapseKey) => {
        const isCollapsed = collapsedGroups[collapseKey];
        return (
            <div 
                onClick={() => setCollapsedGroups(prev => ({ ...prev, [collapseKey]: !prev[collapseKey] }))}
                className="flex items-center gap-2 text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mt-6 mb-2 cursor-pointer hover:text-slate-600 transition-colors select-none"
            >
                {isCollapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                <span>{title}</span>
                <span className="bg-slate-100 dark:bg-slate-800 text-[10px] px-1.5 py-0.5 rounded-full font-bold">
                    {count}
                </span>
            </div>
        );
    };

    return (
        <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto min-h-screen relative flex gap-6">
            
            {/* Left side Workspace */}
            <div className="flex-1 min-w-0">
                {/* Header Title */}
                <div className="mb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-800 flex items-center gap-2">
                            Document History
                        </h1>
                        <p className="text-slate-500 text-sm mt-1">Search through and manage all your analyzed legal documents.</p>
                    </div>

                    {isTrashView && (
                        <button
                            onClick={handleEmptyTrash}
                            className="px-4 py-2 bg-red-50 hover:bg-red-650 border border-red-200 text-red-600 hover:text-white rounded-xl shadow-sm font-semibold text-xs transition-colors flex items-center gap-1.5"
                        >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Empty Trash</span>
                        </button>
                    )}
                </div>

                {/* Storage Health Details Banner */}
                <div className="bg-white/80 border border-slate-200/50 backdrop-blur-md rounded-2xl p-5 shadow-sm space-y-4 mb-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {/* Storage size progress */}
                        <div className="space-y-2">
                            <div className="flex justify-between items-center text-xs font-bold text-slate-500">
                                <span>STORAGE CONSUMED</span>
                                <span className="text-slate-800 font-extrabold">
                                    {formatBytes(stats.totalSize)} / {formatBytes(stats.maxSize)}
                                </span>
                            </div>
                            <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden flex">
                                <div 
                                    className={`h-full rounded-full transition-all duration-500 ${
                                        (stats.totalSize / stats.maxSize) > 0.9 
                                            ? 'bg-red-500' 
                                            : (stats.totalSize / stats.maxSize) > 0.7 
                                                ? 'bg-yellow-500' 
                                                : 'bg-blue-500'
                                    }`}
                                    style={{ width: `${Math.min((stats.totalSize / stats.maxSize) * 100, 100)}%` }}
                                ></div>
                            </div>
                            <div className="flex justify-between items-center text-[10px] font-bold text-slate-400">
                                <span>{((stats.totalSize / stats.maxSize) * 100 || 0).toFixed(0)}% Used</span>
                                <span>{formatBytes(Math.max(stats.maxSize - stats.totalSize, 0))} Remaining</span>
                            </div>
                        </div>

                        {/* Document limits slots progress */}
                        <div className="space-y-2">
                            <div className="flex justify-between items-center text-xs font-bold text-slate-500">
                                <span>DOCUMENTS SLOTS</span>
                                <span className="text-slate-800 font-extrabold">
                                    {stats.totalDocs} / {stats.maxDocs}
                                </span>
                            </div>
                            <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden flex">
                                <div 
                                    className={`h-full rounded-full transition-all duration-500 ${
                                        (stats.totalDocs / stats.maxDocs) > 0.9 
                                            ? 'bg-red-500' 
                                            : (stats.totalDocs / stats.maxDocs) > 0.7 
                                                ? 'bg-yellow-500' 
                                                : 'bg-blue-500'
                                    }`}
                                    style={{ width: `${Math.min((stats.totalDocs / stats.maxDocs) * 100, 100)}%` }}
                                ></div>
                            </div>
                            <div className="flex justify-between items-center text-[10px] font-bold text-slate-400">
                                <span>{((stats.totalDocs / stats.maxDocs) * 100 || 0).toFixed(0)}% Used</span>
                                <span>{Math.max(stats.maxDocs - stats.totalDocs, 0)} slots left</span>
                            </div>
                        </div>

                        {/* Aggregate storage details */}
                        <div className="grid grid-cols-2 gap-4 text-xs font-semibold text-slate-500 border-l border-slate-100 pl-6">
                            <div>
                                <span className="text-[10px] font-black text-slate-400 uppercase block tracking-wider">Largest Document</span>
                                <span className="text-slate-700 font-bold block mt-0.5 truncate max-w-[120px]" title={stats.largestDoc?.name}>
                                    {stats.largestDoc?.name || 'N/A'}
                                </span>
                                <span className="text-[10px] text-slate-500">
                                    {stats.largestDoc ? formatBytes(stats.largestDoc.size) : ''}
                                </span>
                            </div>
                            <div>
                                <span className="text-[10px] font-black text-slate-400 uppercase block tracking-wider">Last Uploaded</span>
                                <span className="text-slate-700 font-bold block mt-0.5 truncate max-w-[120px]" title={stats.lastUploaded?.name}>
                                    {stats.lastUploaded?.name || 'N/A'}
                                </span>
                                <span className="text-[10px] text-slate-500">
                                    {stats.lastUploaded ? new Date(stats.lastUploaded.date).toLocaleDateString() : ''}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Sticky Toolbar container */}
                <div className="sticky top-0 bg-slate-50/80 backdrop-blur-md z-35 py-4 border-b border-slate-200/50 flex flex-col gap-3">
                    <div className="flex flex-col sm:flex-row gap-3">
                        {/* Search Input Box */}
                        <div className="relative flex-1">
                            <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                                <Search className="w-4 h-4" />
                            </span>
                            <input
                                ref={searchInputRef}
                                type="text"
                                placeholder="Search documents... (Ctrl+K)"
                                className="w-full pr-10 py-2.5 bg-white border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-xl text-sm shadow-sm transition-all"
                                style={{ paddingLeft: '2.5rem' }}
                                value={searchQuery}
                                onFocus={() => {
                                    if (searchQuery) addRecentSearch(searchQuery);
                                }}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                            {searchQuery ? (
                                <button 
                                    onClick={() => setSearchQuery('')}
                                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            ) : (
                                <kbd className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-[10px] font-mono text-slate-400">
                                    Ctrl+K
                                </kbd>
                            )}

                            {/* Recent Searches Overlay dropdown */}
                            {recentSearches.length > 0 && !searchQuery && document.activeElement === searchInputRef.current && (
                                <div className="absolute left-0 mt-1 w-full bg-white border border-slate-200 rounded-xl shadow-lg z-50 p-2 text-xs">
                                    <div className="font-bold text-slate-400 px-3 py-1 flex justify-between items-center">
                                        <span>Recent Searches</span>
                                        <button 
                                            onClick={() => {
                                                setRecentSearches([]);
                                                localStorage.removeItem('recentSearches');
                                            }}
                                            className="text-[10px] text-blue-500 hover:underline"
                                        >
                                            Clear All
                                        </button>
                                    </div>
                                    {recentSearches.map((s, idx) => (
                                        <button
                                            key={idx}
                                            onClick={() => {
                                                setSearchQuery(s);
                                                searchInputRef.current?.blur();
                                            }}
                                            className="w-full text-left px-3 py-2 hover:bg-slate-50 text-slate-700 rounded-lg flex items-center gap-2"
                                        >
                                            <Clock className="w-3 h-3 text-slate-400" />
                                            {s}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Right side controls */}
                        <div className="flex gap-2 shrink-0">
                            {/* Sort Dropdown */}
                            <div className="relative flex items-center gap-1.5 bg-white px-3 py-2 border border-slate-200 rounded-xl shadow-sm">
                                <ArrowUpDown className="w-4 h-4 text-slate-400" />
                                <select
                                    className="bg-transparent border-none text-sm font-semibold text-slate-700 focus:outline-none cursor-pointer pr-1"
                                    value={sortBy}
                                    onChange={(e) => setSortBy(e.target.value)}
                                >
                                    <option value="Recent">Recent</option>
                                    <option value="Oldest">Oldest</option>
                                    <option value="Name">Name</option>
                                    <option value="Last Opened">Last Opened</option>
                                </select>
                            </div>

                            {/* Advanced Filter Toggle Button */}
                            <button
                                onClick={() => setIsAdvancedOpen(!isAdvancedOpen)}
                                className={`px-3 py-2 border rounded-xl shadow-sm text-sm font-semibold flex items-center gap-1.5 transition-colors ${
                                    isAdvancedOpen || Object.values(advancedFilters).some(Boolean)
                                        ? 'bg-blue-50 border-blue-200 text-blue-600'
                                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                                }`}
                            >
                                <SlidersHorizontal className="w-4 h-4" />
                                <span className="hidden sm:inline">Filters</span>
                                {Object.values(advancedFilters).filter(Boolean).length > 0 && (
                                    <span className="w-4 h-4 rounded-full bg-blue-600 text-white flex items-center justify-center text-[9px] font-black">
                                        {Object.values(advancedFilters).filter(Boolean).length}
                                    </span>
                                )}
                            </button>

                            {/* New Upload Button */}
                            <button
                                onClick={() => navigate('/dashboard/documents')}
                                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-md shadow-blue-500/10 font-semibold text-sm flex items-center gap-1.5 transition-colors"
                            >
                                <Plus className="w-4 h-4" />
                                <span>Upload</span>
                            </button>
                        </div>
                    </div>

                    {/* Advanced Filters Expandable Drawer */}
                    <AnimatePresence>
                        {isAdvancedOpen && (
                            <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="overflow-hidden bg-white border border-slate-200 rounded-2xl shadow-sm p-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs"
                            >
                                {/* Date Range */}
                                <div className="space-y-1">
                                    <label className="font-bold text-slate-500">Upload Date Start</label>
                                    <input 
                                        type="date" 
                                        name="uploadDateStart"
                                        value={advancedFilters.uploadDateStart}
                                        onChange={handleAdvancedSearchChange}
                                        className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-1 focus:ring-blue-500" 
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="font-bold text-slate-500">Upload Date End</label>
                                    <input 
                                        type="date" 
                                        name="uploadDateEnd"
                                        value={advancedFilters.uploadDateEnd}
                                        onChange={handleAdvancedSearchChange}
                                        className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-1 focus:ring-blue-500" 
                                    />
                                </div>

                                {/* Court */}
                                <div className="space-y-1">
                                    <label className="font-bold text-slate-500">Court Name</label>
                                    <input 
                                        type="text" 
                                        name="court"
                                        placeholder="e.g. Supreme Court"
                                        value={advancedFilters.court}
                                        onChange={handleAdvancedSearchChange}
                                        className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-1 focus:ring-blue-500" 
                                    />
                                </div>

                                {/* Judge */}
                                <div className="space-y-1">
                                    <label className="font-bold text-slate-500">Judge Name</label>
                                    <input 
                                        type="text" 
                                        name="judge"
                                        placeholder="e.g. Chandrachud"
                                        value={advancedFilters.judge}
                                        onChange={handleAdvancedSearchChange}
                                        className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-1 focus:ring-blue-500" 
                                    />
                                </div>

                                {/* Language */}
                                <div className="space-y-1">
                                    <label className="font-bold text-slate-500">Language</label>
                                    <select
                                        name="language"
                                        value={advancedFilters.language}
                                        onChange={handleAdvancedSearchChange}
                                        className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
                                    >
                                        <option value="">All</option>
                                        <option value="English">English</option>
                                        <option value="Hindi">Hindi</option>
                                    </select>
                                </div>

                                {/* Document Type */}
                                <div className="space-y-1">
                                    <label className="font-bold text-slate-500">Doc Type</label>
                                    <select
                                        name="documentType"
                                        value={advancedFilters.documentType}
                                        onChange={handleAdvancedSearchChange}
                                        className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
                                    >
                                        <option value="">All</option>
                                        <option value="Supreme Court">Supreme Court</option>
                                        <option value="High Court">High Court</option>
                                        <option value="Act">Act</option>
                                        <option value="Contract">Contract</option>
                                        <option value="Other">Other</option>
                                    </select>
                                </div>

                                {/* Action Buttons */}
                                <div className="sm:col-span-2 md:col-span-3 flex justify-end gap-2 pt-2 border-t border-slate-100">
                                    <button 
                                        onClick={resetAdvancedFilters}
                                        className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg font-bold text-slate-600 transition-colors"
                                    >
                                        Reset
                                    </button>
                                    <button 
                                        onClick={() => setIsAdvancedOpen(false)}
                                        className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold shadow transition-colors"
                                    >
                                        Apply
                                    </button>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Filter Chips Toolbar - Multi-select */}
                <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none mt-3 -mx-4 px-4 md:mx-0 md:px-0 flex-nowrap sm:flex-wrap">
                    {['All', 'Supreme Court', 'High Court', 'Acts', 'Contracts', 'English', 'Hindi', 'Favorites', 'Pinned', 'Recent', 'Trash'].map((opt) => {
                        const isSelected = activeFilters.includes(opt);
                        return (
                            <button
                                key={opt}
                                onClick={() => handleFilterChipClick(opt)}
                                className={`px-4 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all border shrink-0 ${
                                    isSelected
                                        ? 'bg-blue-600 border-blue-600 text-white shadow shadow-blue-500/10'
                                        : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                                }`}
                            >
                                {opt === 'Trash' ? '🗑️ Trash' : opt}
                            </button>
                        );
                    })}
                </div>

                {/* Primary List Area */}
                {isLoading ? (
                    <div className="bg-white/70 backdrop-blur-md rounded-2xl p-20 border border-slate-200/50 shadow-sm flex flex-col items-center justify-center text-blue-600 mt-6">
                        <Loader2 className="w-8 h-8 animate-spin mb-4" />
                        <p className="font-semibold text-sm animate-pulse">Loading documents history...</p>
                    </div>
                ) : documents.length === 0 ? (
                    <div className="bg-white rounded-2xl p-16 border border-slate-200/50 shadow-sm flex flex-col items-center justify-center text-center space-y-4 mt-6">
                        <div className="w-12 h-12 rounded-xl bg-slate-50 text-slate-300 flex items-center justify-center text-2xl shadow-inner select-none font-sans">
                            📄
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-slate-700">{isTrashView ? 'Trash is empty' : 'No documents match search'}</h3>
                            <p className="text-slate-400 max-w-xs mt-0.5 text-xs">
                                {isTrashView ? 'Deleted documents will be shown here.' : 'Try adjusting your filters or search keywords.'}
                            </p>
                        </div>
                        {!isTrashView && (
                            <button 
                                onClick={() => {
                                    setSearchQuery('');
                                    setActiveFilters(['All']);
                                    resetAdvancedFilters();
                                }}
                                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-xs transition-colors shadow-sm"
                            >
                                Reset Queries
                            </button>
                        )}
                    </div>
                ) : (
                    /* The Groups */
                    <div className="space-y-2 mt-4">
                        {/* If Trash View, render flat without time groupings to see trash bin clean */}
                        {isTrashView ? (
                            <div className="space-y-1">
                                {renderSectionHeader("Deleted Documents (Permanently purged after 30 days)", documents.length, "trash")}
                                {!collapsedGroups.trash && documents.map(doc => renderDocRow(doc))}
                            </div>
                        ) : (
                            <>
                                {/* 1. Pinned Documents */}
                                {groupedDocuments.pinned.length > 0 && (
                                    <>
                                        {renderSectionHeader("📌 Pinned", groupedDocuments.pinned.length, "pinned")}
                                        {!collapsedGroups.pinned && (
                                            <div className="space-y-1">
                                                {groupedDocuments.pinned.map(doc => renderDocRow(doc))}
                                            </div>
                                        )}
                                    </>
                                )}

                                {/* 2. Favorites */}
                                {groupedDocuments.favorites.length > 0 && (
                                    <>
                                        {renderSectionHeader("⭐ Favorites", groupedDocuments.favorites.length, "favorites")}
                                        {!collapsedGroups.favorites && (
                                            <div className="space-y-1">
                                                {groupedDocuments.favorites.map(doc => renderDocRow(doc))}
                                            </div>
                                        )}
                                    </>
                                )}

                                {/* 3. Recently Opened */}
                                {groupedDocuments.recentlyOpened.length > 0 && (
                                    <>
                                        {renderSectionHeader("Recently Opened", groupedDocuments.recentlyOpened.length, "recentlyOpened")}
                                        {!collapsedGroups.recentlyOpened && (
                                            <div className="space-y-1">
                                                {groupedDocuments.recentlyOpened.map(doc => renderDocRow(doc))}
                                            </div>
                                        )}
                                    </>
                                )}

                                {/* Chronological groupings */}
                                {groupedDocuments.today.length > 0 && (
                                    <>
                                        {renderSectionHeader("Today", groupedDocuments.today.length, "today")}
                                        {!collapsedGroups.today && (
                                            <div className="space-y-1">
                                                {groupedDocuments.today.map(doc => renderDocRow(doc))}
                                            </div>
                                        )}
                                    </>
                                )}

                                {groupedDocuments.yesterday.length > 0 && (
                                    <>
                                        {renderSectionHeader("Yesterday", groupedDocuments.yesterday.length, "yesterday")}
                                        {!collapsedGroups.yesterday && (
                                            <div className="space-y-1">
                                                {groupedDocuments.yesterday.map(doc => renderDocRow(doc))}
                                            </div>
                                        )}
                                    </>
                                )}

                                {groupedDocuments.previous7.length > 0 && (
                                    <>
                                        {renderSectionHeader("Previous 7 Days", groupedDocuments.previous7.length, "previous7")}
                                        {!collapsedGroups.previous7 && (
                                            <div className="space-y-1">
                                                {groupedDocuments.previous7.map(doc => renderDocRow(doc))}
                                            </div>
                                        )}
                                    </>
                                )}

                                {groupedDocuments.previous30.length > 0 && (
                                    <>
                                        {renderSectionHeader("Previous 30 Days", groupedDocuments.previous30.length, "previous30")}
                                        {!collapsedGroups.previous30 && (
                                            <div className="space-y-1">
                                                {groupedDocuments.previous30.map(doc => renderDocRow(doc))}
                                            </div>
                                        )}
                                    </>
                                )}

                                {/* Month Year specific sections */}
                                {Object.keys(groupedDocuments.months).sort().reverse().map(monthKey => {
                                    const count = groupedDocuments.months[monthKey].length;
                                    return (
                                        <div key={monthKey}>
                                            {renderSectionHeader(monthKey, count, monthKey)}
                                            {!collapsedGroups[monthKey] && (
                                                <div className="space-y-1">
                                                    {groupedDocuments.months[monthKey].map(doc => renderDocRow(doc))}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}

                                {groupedDocuments.older.length > 0 && (
                                    <>
                                        {renderSectionHeader("Older", groupedDocuments.older.length, "older")}
                                        {!collapsedGroups.older && (
                                            <div className="space-y-1">
                                                {groupedDocuments.older.map(doc => renderDocRow(doc))}
                                            </div>
                                        )}
                                    </>
                                )}
                            </>
                        )}

                        {/* Target element for Infinite Scroll IntersectionObserver */}
                        <div ref={loadMoreRef} className="py-8 flex justify-center text-slate-450 text-xs">
                            {isInfiniteLoading && (
                                <div className="flex items-center gap-1.5 font-semibold text-blue-600">
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    <span>Fetching older records...</span>
                                </div>
                            )}
                            {!hasMore && documents.length > 0 && (
                                <span className="font-semibold text-slate-500">All documents loaded</span>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Quick Preview Hover Panel - Aligned Right on Desktop */}
            <div className="hidden lg:block w-80 shrink-0">
                <div className="sticky top-6 bg-white/70 backdrop-blur-md border border-slate-200/50 rounded-2xl p-5 shadow-sm space-y-4 min-h-[400px] flex flex-col justify-between">
                    {hoveredDoc ? (
                        <>
                            <div className="space-y-4">
                                {/* Simulated Document Graphic */}
                                <div className="relative h-28 bg-gradient-to-br from-slate-100 to-slate-200/70 border border-slate-200 rounded-xl flex items-center justify-center overflow-hidden">
                                    <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-blue-500/10 text-blue-600 flex items-center justify-center text-xs font-black">
                                        ⚖️
                                    </div>
                                    <div className="flex flex-col items-center">
                                        <FileText className="w-10 h-10 text-slate-400" />
                                        <span className="text-[10px] uppercase font-black text-slate-400 tracking-widest mt-1">
                                            {hoveredDoc.documentType || 'Legal Document'}
                                        </span>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <h4 className="font-extrabold text-slate-800 text-sm truncate" title={hoveredDoc.documentName || hoveredDoc.originalName}>
                                        {hoveredDoc.documentName || hoveredDoc.originalName}
                                    </h4>
                                    
                                    <div className="flex flex-wrap gap-1">
                                        {hoveredDoc.language && (
                                            <span className="text-[9px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-bold">
                                                {hoveredDoc.language}
                                            </span>
                                        )}
                                        {hoveredDoc.fileSize && (
                                            <span className="text-[9px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-bold">
                                                {formatBytes(hoveredDoc.fileSize)}
                                            </span>
                                        )}
                                    </div>
                                </div>

                                <div className="h-px bg-slate-100"></div>

                                {/* Preview Summary Text */}
                                <div className="space-y-1">
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">AI Summary Overview</span>
                                    <p className="text-xs text-slate-600 leading-relaxed max-h-36 overflow-y-auto pr-1">
                                        {hoveredDoc.summary?.aiSummary?.documentOverview || 
                                         hoveredDoc.summary?.simpleLanguageSummary || 
                                         'No brief overview details are saved. Open the document to trigger full AI processing.'}
                                    </p>
                                </div>

                                {/* Key Metadata */}
                                {hoveredDoc.metadata?.structuredData && (
                                    <div className="space-y-1 pt-2">
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Key Metadata</span>
                                        <div className="text-[11px] text-slate-700 font-bold space-y-1">
                                            {hoveredDoc.metadata.structuredData.courtName && (
                                                <div className="truncate text-slate-500">
                                                    Court: <span className="text-slate-800 font-extrabold">{hoveredDoc.metadata.structuredData.courtName}</span>
                                                </div>
                                            )}
                                            {hoveredDoc.metadata.structuredData.caseNumber && (
                                                <div className="truncate text-slate-500">
                                                    Case: <span className="text-slate-800 font-extrabold">{hoveredDoc.metadata.structuredData.caseNumber}</span>
                                                </div>
                                            )}
                                            {hoveredDoc.metadata.structuredData.judgeName && (
                                                <div className="truncate text-slate-500">
                                                    Judge: <span className="text-slate-800 font-extrabold">{hoveredDoc.metadata.structuredData.judgeName}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {!hoveredDoc.deleted && (
                                <button
                                    onClick={() => handleOpenDocument(hoveredDoc._id)}
                                    className="w-full py-2 bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white rounded-xl font-bold text-xs transition-colors flex items-center justify-center gap-1.5 shadow-inner"
                                >
                                    <Play className="w-3.5 h-3.5 fill-current" /> Open Document
                                </button>
                            )}
                        </>
                    ) : (
                        <div className="my-auto text-center py-10 space-y-3">
                            <Eye className="w-8 h-8 text-slate-300 mx-auto" />
                            <div>
                                <h5 className="font-extrabold text-slate-700 text-xs">Quick Preview</h5>
                                <p className="text-[11px] text-slate-400 max-w-xs mx-auto px-4 mt-0.5">
                                    Hover cursor over any document to view its AI summary overview, metadata, and details.
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Sticky Floating Bulk Actions Bar */}
            {selectedDocs.size > 0 && (
                <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-slate-900/90 text-white backdrop-blur-md px-6 py-3 rounded-full flex items-center gap-4 shadow-xl z-50 animate-bounce-short text-xs">
                    <span className="font-bold text-slate-200">
                        {selectedDocs.size} selected
                    </span>
                    <div className="h-4 w-px bg-slate-700"></div>
                    
                    {isTrashView ? (
                        <>
                            <button 
                                onClick={handleBulkRestore}
                                className="font-bold hover:text-blue-400 flex items-center gap-1.5 transition-colors"
                            >
                                <RotateCcw className="w-3.5 h-3.5" /> Restore
                            </button>
                            <button 
                                onClick={handleBulkDelete}
                                className="font-bold hover:text-red-400 flex items-center gap-1.5 transition-colors"
                            >
                                <Trash2 className="w-3.5 h-3.5" /> Permanent Delete
                            </button>
                        </>
                    ) : (
                        <>
                            <button 
                                onClick={handleBulkDownload}
                                className="font-bold hover:text-blue-400 flex items-center gap-1.5 transition-colors"
                            >
                                <Download className="w-3.5 h-3.5" /> Download
                            </button>
                            <button 
                                onClick={handleBulkDelete}
                                className="font-bold hover:text-red-400 flex items-center gap-1.5 transition-colors"
                            >
                                <Trash2 className="w-3.5 h-3.5" /> Move to Trash
                            </button>
                        </>
                    )}
                    
                    <button 
                        onClick={() => setSelectedDocs(new Set())}
                        className="font-bold text-slate-400 hover:text-white transition-colors"
                    >
                        Clear
                    </button>
                </div>
            )}

            {/* Confirmation Modal for Deleting Document */}
            <AnimatePresence>
                {docToDelete && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 bg-black/40 backdrop-blur-sm"
                            onClick={() => setDocToDelete(null)}
                        />
                        
                        <motion.div 
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className="bg-white rounded-3xl p-6 shadow-2xl border border-slate-100 max-w-sm w-full z-50 text-center space-y-4 relative"
                        >
                            <div className="w-12 h-12 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center mx-auto shadow-inner">
                                <Trash2 className="w-6 h-6" />
                            </div>
                            
                            <div className="space-y-2">
                                <h3 className="text-lg font-black text-slate-800">
                                    {isPermanentDelete ? 'Permanently delete document?' : 'Move to Trash?'}
                                </h3>
                                <p className="text-slate-500 text-xs sm:text-sm leading-relaxed">
                                    {isPermanentDelete 
                                        ? `Are you sure you want to PERMANENTLY remove ${docToDelete.documentName || docToDelete.originalName}? This action is irreversible.`
                                        : `Are you sure you want to move ${docToDelete.documentName || docToDelete.originalName} to the Trash folder? Trashed items are automatically auto-purged after 30 days.`}
                                </p>
                            </div>

                            <div className="flex items-center gap-3 pt-2">
                                <button
                                    onClick={() => setDocToDelete(null)}
                                    className="flex-1 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-500 hover:text-slate-800 font-bold rounded-xl text-xs transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleDeleteConfirm}
                                    className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl text-xs shadow-md shadow-red-500/10 transition-colors"
                                >
                                    {isPermanentDelete ? 'Delete Permanently' : 'Move to Trash'}
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );

    // 7. Compact Rows Rendering inside Groups
    function renderDocRow(doc) {
        const isEditingRename = editingDocId === doc._id;
        const isEditingNotes = editingNotesDocId === doc._id;
        const isSelected = selectedDocs.has(doc._id);
        const isActiveKeyboard = keyboardActiveId === doc._id;

        return (
            <div 
                key={doc._id}
                id={`doc-row-${doc._id}`}
                className={`group flex items-start sm:items-center justify-between px-3 py-2.5 rounded-xl border border-transparent transition-all duration-150 relative cursor-pointer ${
                    isSelected ? 'bg-blue-50/50 border-blue-200' : 'hover:bg-white hover:border-slate-200/50 hover:shadow-sm'
                } ${isActiveKeyboard ? 'bg-slate-100 border-slate-300' : ''}`}
                onClick={() => {
                    if (!doc.deleted) {
                        handleOpenDocument(doc._id);
                    }
                }}
                onMouseEnter={(e) => handleRowHoverEnter(e, doc)}
                onMouseLeave={handleRowHoverLeave}
                onTouchStart={(e) => handleTouchStart(e, doc)}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
            >
                {/* Checkbox and Left Info */}
                <div className="flex items-center gap-3 min-w-0 flex-1">
                    {/* Checkbox for bulk action */}
                    <div 
                        onClick={(e) => {
                            e.stopPropagation();
                            toggleSelectDoc(e, doc._id);
                        }}
                        className={`w-4 h-4 rounded border transition-all flex items-center justify-center shrink-0 ${
                            isSelected 
                                ? 'bg-blue-600 border-blue-600 text-white' 
                                : 'bg-white border-slate-300 group-hover:opacity-100 opacity-0 lg:opacity-0 sm:opacity-50'
                        }`}
                    >
                        {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                    </div>

                    {/* File Icon */}
                    <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                        <FileText className="w-4 h-4" />
                    </div>

                    {/* Text Details Area */}
                    <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                            {isEditingRename ? (
                                <input
                                    type="text"
                                    value={renameValue}
                                    onChange={(e) => setRenameValue(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') handleRenameConfirm(doc._id, renameValue);
                                        if (e.key === 'Escape') setEditingDocId(null);
                                    }}
                                    onClick={(e) => e.stopPropagation()}
                                    onBlur={() => handleRenameConfirm(doc._id, renameValue)}
                                    autoFocus
                                    className="w-full bg-white border border-blue-500 rounded px-1.5 py-0.5 text-sm font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                />
                            ) : (
                                <h4 className="text-sm font-bold text-slate-700 truncate" title={doc.documentName || doc.originalName}>
                                    {doc.documentName || doc.originalName}
                                </h4>
                            )}

                            {/* Tags or badges */}
                            {doc.documentType && (
                                <span className={`inline-block border px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider ${getBadgeStyle(doc.documentType)}`}>
                                    {doc.documentType}
                                </span>
                            )}
                        </div>

                        {/* File Details Subtitle */}
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px] text-slate-400 font-semibold mt-0.5">
                            {doc.metadata?.structuredData?.courtName && (
                                <span>{doc.metadata.structuredData.courtName}</span>
                            )}
                            {doc.metadata?.structuredData?.courtName && <span>•</span>}
                            <span>{doc.language || 'English'}</span>
                            <span>•</span>
                            <span>Uploaded {new Date(doc.uploadDate).toLocaleDateString()}</span>
                            <span>•</span>
                            <span>Opened {new Date(doc.lastOpened).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>

                        {/* Notes editor and renderer */}
                        {isEditingNotes ? (
                            <div className="mt-1 flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                                <input
                                    type="text"
                                    placeholder="Add personal notes..."
                                    value={notesValue}
                                    onChange={(e) => setNotesValue(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') handleNotesConfirm(doc._id, notesValue);
                                        if (e.key === 'Escape') setEditingNotesDocId(null);
                                    }}
                                    onBlur={() => handleNotesConfirm(doc._id, notesValue)}
                                    autoFocus
                                    className="w-full bg-white border border-blue-400 rounded-lg px-2 py-1 text-xs text-slate-600 focus:outline-none focus:ring-1 focus:ring-blue-400"
                                />
                            </div>
                        ) : doc.notes ? (
                            <p className="text-[11px] text-slate-500 mt-1 font-semibold flex items-center gap-1.5 italic bg-slate-50 border border-slate-100/50 rounded-lg px-2 py-0.5 w-max max-w-full">
                                <MessageSquare className="w-3 h-3 text-slate-400 shrink-0" />
                                <span className="truncate">{doc.notes}</span>
                            </p>
                        ) : null}
                    </div>
                </div>

                {/* Right side hover actions */}
                <div className="flex items-center gap-1 shrink-0 ml-4 h-full relative z-20">
                    <div className="lg:opacity-0 lg:group-hover:opacity-100 flex items-center gap-0.5 bg-white/70 backdrop-blur rounded-lg p-0.5 border border-slate-100 transition-opacity">
                        {doc.deleted ? (
                            // Trash view specific actions
                            <>
                                {/* Restore Button */}
                                <button
                                    onClick={(e) => handleRestore(e, doc)}
                                    className="p-1.5 rounded hover:bg-slate-200 text-slate-500 hover:text-blue-600 transition-colors"
                                    title="Restore Document"
                                >
                                    <RotateCcw className="w-3.5 h-3.5" />
                                </button>

                                {/* Delete Permanently Button */}
                                <button
                                    onClick={(e) => initiateDelete(e, doc)}
                                    className="p-1.5 rounded hover:bg-red-50 text-slate-500 hover:text-red-600 transition-colors"
                                    title="Delete Permanently"
                                >
                                    <Trash2 className="w-3.5 h-3.5" />
                                </button>
                            </>
                        ) : (
                            // Standard active document actions
                            <>
                                {/* Pin Button */}
                                <button
                                    onClick={(e) => handlePinToggle(e, doc)}
                                    className={`p-1.5 rounded hover:bg-slate-200 transition-colors ${
                                        doc.pinned ? 'text-indigo-600' : 'text-slate-400 hover:text-indigo-600'
                                    }`}
                                    title={doc.pinned ? 'Unpin Document' : 'Pin Document'}
                                >
                                    <Pin className="w-3.5 h-3.5" />
                                </button>

                                {/* Favorite Button */}
                                <button
                                    onClick={(e) => handleFavoriteToggle(e, doc)}
                                    className={`p-1.5 rounded hover:bg-slate-200 transition-colors ${
                                        doc.favorite ? 'text-yellow-500' : 'text-slate-400 hover:text-yellow-500'
                                    }`}
                                    title={doc.favorite ? 'Remove Favorite' : 'Mark Favorite'}
                                >
                                    <Star className={`w-3.5 h-3.5 ${doc.favorite ? 'fill-current' : ''}`} />
                                </button>

                                {/* Inline Rename button */}
                                <button
                                    onClick={(e) => startRename(e, doc)}
                                    className="p-1.5 rounded hover:bg-slate-200 text-slate-400 hover:text-slate-700 transition-colors"
                                    title="Rename"
                                >
                                    <Edit2 className="w-3.5 h-3.5" />
                                </button>

                                {/* Edit Notes button */}
                                <button
                                    onClick={(e) => startNotes(e, doc)}
                                    className="p-1.5 rounded hover:bg-slate-200 text-slate-400 hover:text-slate-700 transition-colors"
                                    title="Notes"
                                >
                                    <MessageSquare className="w-3.5 h-3.5" />
                                </button>

                                {/* Download text button */}
                                <button
                                    onClick={(e) => handleDownload(e, doc)}
                                    className="p-1.5 rounded hover:bg-slate-200 text-slate-400 hover:text-slate-700 transition-colors"
                                    title="Download text file"
                                >
                                    <Download className="w-3.5 h-3.5" />
                                </button>

                                {/* Move to Trash button */}
                                <button
                                    onClick={(e) => initiateDelete(e, doc)}
                                    className="p-1.5 rounded hover:bg-red-50 text-slate-400 hover:text-red-600 transition-colors"
                                    title="Move to Trash"
                                >
                                    <Trash2 className="w-3.5 h-3.5" />
                                </button>
                            </>
                        )}
                    </div>

                    {/* Standard Action button overlay on mobile */}
                    <button 
                        onClick={(e) => {
                            e.stopPropagation();
                            if (doc.deleted) {
                                handleRestore(e, doc);
                            } else {
                                handleOpenDocument(doc._id);
                            }
                        }}
                        className="p-1.5 rounded-lg border border-slate-100 text-slate-400 hover:text-slate-700 hover:bg-slate-50 lg:hidden transition-colors"
                    >
                        <ChevronRight className="w-4 h-4" />
                    </button>
                </div>
            </div>
        );
    }
};

export default DocumentHistoryPage;
