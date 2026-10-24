import React, { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import LinkExtension from "@tiptap/extension-link";
import ImageExtension from "@tiptap/extension-image";
import { Table } from "@tiptap/extension-table";
import { TableRow } from "@tiptap/extension-table-row";
import { TableCell } from "@tiptap/extension-table-cell";
import { TableHeader } from "@tiptap/extension-table-header";
import TextAlign from "@tiptap/extension-text-align";
import Underline from "@tiptap/extension-underline";
import Highlight from "@tiptap/extension-highlight";
import Youtube from "@tiptap/extension-youtube";
import { TextStyle } from "@tiptap/extension-text-style";
import { Color } from "@tiptap/extension-color";
import { Subscript } from "@tiptap/extension-subscript";
import { Superscript } from "@tiptap/extension-superscript";
import { Typography } from "@tiptap/extension-typography";
import { uploadImage } from "../../lib/supabase";
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  Code,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  List,
  ListOrdered,
  Heading1,
  Heading2,
  Heading3,
  Heading4,
  Quote,
  Minus,
  Link as LinkIcon,
  Unlink,
  Image as ImageIcon,
  Video,
  Table as TableIcon,
  Undo2,
  Redo2,
  Highlighter,
  AlertCircle,
  Info,
  CheckCircle,
  HelpCircle,
  Trash2,
  Plus,
  Maximize2,
  Minimize2,
  Upload,
  Palette,
  Type,
  Search,
  Download,
  Copy,
  Printer,
  Check,
  X,
  Sparkles,
  FileText,
  ChevronDown,
  Columns,
  BarChart3,
  Eraser,
  Subscript as SubIcon,
  Superscript as SupIcon,
  LayoutTemplate,
  Monitor,
  BookOpen,
} from "lucide-react";

export interface DocumentHeading {
  id: string;
  text: string;
  level: number;
}

interface TiptapEditorProps {
  content: string;
  onChange: (html: string) => void;
  placeholder?: string;
  className?: string;
  onHeadingsChange?: (headings: DocumentHeading[]) => void;
}

export type ViewMode = "PAGE" | "FLUID" | "ZEN";
export type FontFamily = "sans" | "serif" | "mono";

const COLOR_PALETTE = [
  { name: "Default", color: "#f3f4f6" },
  { name: "Pacific Green", color: "#7FB706" },
  { name: "Neon Lime", color: "#B5F823" },
  { name: "Sky Blue", color: "#38bdf8" },
  { name: "Amber Gold", color: "#f59e0b" },
  { name: "Crimson Red", color: "#ef4444" },
  { name: "Purple", color: "#a855f7" },
  { name: "Slate Gray", color: "#94a3b8" },
];

const HIGHLIGHT_PALETTE = [
  { name: "None", color: "" },
  { name: "Brand Green", color: "rgba(127, 183, 6, 0.35)" },
  { name: "Bright Yellow", color: "rgba(234, 179, 8, 0.35)" },
  { name: "Cyan Blue", color: "rgba(56, 189, 248, 0.35)" },
  { name: "Amber Orange", color: "rgba(249, 115, 22, 0.35)" },
  { name: "Rose Pink", color: "rgba(244, 63, 94, 0.35)" },
];

export const TiptapEditor: React.FC<TiptapEditorProps> = ({
  content,
  onChange,
  placeholder = "Write your comprehensive article content here...",
  className = "",
  onHeadingsChange,
}) => {
  // View Modes & Canvas Controls
  const [viewMode, setViewMode] = useState<ViewMode>("PAGE");
  const [fontFamily, setFontFamily] = useState<FontFamily>("sans");

  // Modals & Popovers
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const [linkOpenNewTab, setLinkOpenNewTab] = useState(true);

  const [showImageModal, setShowImageModal] = useState(false);
  const [imageUrl, setImageUrl] = useState("");
  const [imageAlt, setImageAlt] = useState("");
  const [imageCaption, setImageCaption] = useState("");
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  const [showVideoModal, setShowVideoModal] = useState(false);
  const [videoUrl, setVideoUrl] = useState("");

  const [showTableModal, setShowTableModal] = useState(false);
  const [tableRows, setTableRows] = useState(3);
  const [tableCols, setTableCols] = useState(3);

  const [showColorPopover, setShowColorPopover] = useState(false);
  const [showHighlightPopover, setShowHighlightPopover] = useState(false);
  const [showComponentMenu, setShowComponentMenu] = useState(false);
  const [showFindReplaceModal, setShowFindReplaceModal] = useState(false);
  const [showShortcutsModal, setShowShortcutsModal] = useState(false);

  // Find & Replace
  const [searchTerm, setSearchTerm] = useState("");
  const [replaceTerm, setReplaceTerm] = useState("");
  const [matchCount, setMatchCount] = useState<number | null>(null);

  // Copy notification
  const [copiedNotification, setCopiedNotification] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Keyboard shortcut: Escape exits Zen mode
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && viewMode === "ZEN") {
        setViewMode("PAGE");
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [viewMode]);

  // Lock document body scroll when Zen mode is active
  useEffect(() => {
    if (viewMode === "ZEN") {
      const prevOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = prevOverflow;
      };
    }
  }, [viewMode]);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3, 4],
        },
      }),
      Underline,
      Highlight.configure({ multicolor: true }),
      TextAlign.configure({
        types: ["heading", "paragraph"],
      }),
      TextStyle,
      Color,
      Subscript,
      Superscript,
      Typography,
      LinkExtension.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: "text-[#7FB706] hover:underline font-medium cursor-pointer",
          rel: "noopener noreferrer",
          target: "_blank",
        },
      }),
      ImageExtension.configure({
        inline: true,
        allowBase64: false,
        HTMLAttributes: {
          class: "rounded-2xl max-w-full my-6 shadow-md border border-white/10",
        },
      }),
      Table.configure({
        resizable: true,
        HTMLAttributes: {
          class: "w-full border-collapse my-6 rounded-xl overflow-hidden border border-white/20",
        },
      }),
      TableRow,
      TableHeader.configure({
        HTMLAttributes: {
          class: "bg-white/10 font-bold p-3 border border-white/20 text-left text-white text-sm",
        },
      }),
      TableCell.configure({
        HTMLAttributes: {
          class: "p-3 border border-white/15 text-gray-300 text-sm",
        },
      }),
      Youtube.configure({
        controls: true,
        nocookie: true,
        allowFullscreen: true,
        HTMLAttributes: {
          class: "w-full aspect-video rounded-2xl my-6 overflow-hidden shadow-xl",
        },
      }),
    ],
    content,
    editorProps: {
      attributes: {
        class:
          "tiptap-word-canvas min-h-[460px] focus:outline-none text-gray-200 leading-relaxed text-base selection:bg-[#7FB706]/30",
      },
    },
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      onChange(html);

      // Extract headings for outline
      if (onHeadingsChange) {
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, "text/html");
        const headingEls = doc.querySelectorAll("h1, h2, h3, h4");
        const list: DocumentHeading[] = [];
        headingEls.forEach((el, idx) => {
          const text = el.textContent || "";
          if (text.trim()) {
            list.push({
              id: `doc-heading-${idx}`,
              text: text.trim(),
              level: parseInt(el.tagName.replace("H", ""), 10) || 2,
            });
          }
        });
        onHeadingsChange(list);
      }
    },
  });

  // Calculate live statistics
  const stats = useMemo(() => {
    if (!editor) return { words: 0, characters: 0, charactersNoSpaces: 0, paragraphs: 0, readingTime: "1 min" };
    const text = editor.getText();
    const words = text.trim() ? text.trim().split(/\s+/).filter(Boolean).length : 0;
    const characters = text.length;
    const charactersNoSpaces = text.replace(/\s+/g, "").length;
    const paragraphs = text.split(/\n+/).filter((p) => p.trim().length > 0).length || (text.trim() ? 1 : 0);
    const minutes = Math.max(1, Math.ceil(words / 200));
    return {
      words,
      characters,
      charactersNoSpaces,
      paragraphs,
      readingTime: `${minutes} min read`,
    };
  }, [editor?.state.doc]);

  // Readability estimate
  const readabilityGrade = useMemo(() => {
    if (stats.words < 30) return "Drafting";
    if (stats.words > 1200) return "Comprehensive Guide";
    if (stats.words > 600) return "In-Depth Article";
    return "Standard Blog";
  }, [stats.words]);

  // Keyboard shortcut handler for Find & Replace and Zen mode
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "f") {
        e.preventDefault();
        setShowFindReplaceModal((prev) => !prev);
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "/") {
        e.preventDefault();
        setShowShortcutsModal((prev) => !prev);
      }
      if (e.key === "Escape") {
        if (viewMode === "ZEN") setViewMode("PAGE");
        setShowColorPopover(false);
        setShowHighlightPopover(false);
        setShowComponentMenu(false);
        setShowFindReplaceModal(false);
        setShowShortcutsModal(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [viewMode]);

  // Link Handling
  const handleOpenLinkModal = () => {
    if (!editor) return;
    const previousUrl = editor.getAttributes("link").href || "";
    setLinkUrl(previousUrl);
    setShowLinkModal(true);
  };

  const handleApplyLink = () => {
    if (!editor) return;
    if (!linkUrl.trim()) {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      setShowLinkModal(false);
      return;
    }

    let formattedUrl = linkUrl.trim();
    if (!/^https?:\/\//i.test(formattedUrl) && !formattedUrl.startsWith("/") && !formattedUrl.startsWith("#")) {
      formattedUrl = `https://${formattedUrl}`;
    }

    editor
      .chain()
      .focus()
      .extendMarkRange("link")
      .setLink({
        href: formattedUrl,
        target: linkOpenNewTab ? "_blank" : undefined,
      })
      .run();

    setShowLinkModal(false);
    setLinkUrl("");
  };

  // Image Upload Handling
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editor) return;

    try {
      setIsUploadingImage(true);
      const uploadedUrl = await uploadImage(file, "blogs");
      if (uploadedUrl) {
        editor
          .chain()
          .focus()
          .setImage({
            src: uploadedUrl,
            alt: imageAlt || file.name,
            title: imageCaption || undefined,
          })
          .run();
        setShowImageModal(false);
        setImageUrl("");
        setImageAlt("");
        setImageCaption("");
      }
    } catch {
      alert("Failed to upload image. Please try again.");
    } finally {
      setIsUploadingImage(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleApplyUrlImage = () => {
    if (!editor || !imageUrl.trim()) return;
    editor
      .chain()
      .focus()
      .setImage({
        src: imageUrl.trim(),
        alt: imageAlt.trim() || "Article image",
        title: imageCaption.trim() || undefined,
      })
      .run();
    setShowImageModal(false);
    setImageUrl("");
    setImageAlt("");
    setImageCaption("");
  };

  // Video Embed Handling
  const handleApplyVideo = () => {
    if (!editor || !videoUrl.trim()) return;
    const url = videoUrl.trim();

    if (url.includes("youtube.com") || url.includes("youtu.be")) {
      editor.chain().focus().setYoutubeVideo({ src: url }).run();
    } else if (url.includes("vimeo.com")) {
      const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
      const vimeoId = vimeoMatch ? vimeoMatch[1] : "";
      if (vimeoId) {
        const embedHtml = `<div class="aspect-video my-6 rounded-2xl overflow-hidden shadow-xl"><iframe src="https://player.vimeo.com/video/${vimeoId}" class="w-full h-full" frameborder="0" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen title="Vimeo Video"></iframe></div>`;
        editor.chain().focus().insertContent(embedHtml).run();
      }
    } else {
      alert("Please provide a valid YouTube or Vimeo URL.");
      return;
    }

    setShowVideoModal(false);
    setVideoUrl("");
  };

  // Table Insert
  const handleInsertTable = () => {
    if (!editor) return;
    editor
      .chain()
      .focus()
      .insertTable({ rows: Number(tableRows), cols: Number(tableCols), withHeaderRow: true })
      .run();
    setShowTableModal(false);
  };

  // Real-World Component Presets
  const insertComponentPreset = (
    type:
      | "tip"
      | "warning"
      | "critical"
      | "cta"
      | "spec-table"
      | "pros-cons"
      | "metrics"
      | "faq"
  ) => {
    if (!editor) return;

    if (type === "tip") {
      const html = `
        <div class="border-l-4 border-emerald-500 bg-emerald-500/10 text-emerald-200 p-4 rounded-r-2xl my-6 shadow-sm">
          <div class="font-bold flex items-center gap-1.5 text-emerald-400 mb-1">
            <span>💡 Pro Tip:</span>
          </div>
          <p class="text-sm leading-relaxed m-0">12mm Compact Laminate panels exhibit zero water absorption (< 0.5%), antibacterial surface finishes, and conform to EN 438-4 architectural standards for high-traffic public washrooms.</p>
        </div><p></p>
      `;
      editor.chain().focus().insertContent(html).run();
    } else if (type === "warning") {
      const html = `
        <div class="border-l-4 border-amber-500 bg-amber-500/10 text-amber-200 p-4 rounded-r-2xl my-6 shadow-sm">
          <div class="font-bold flex items-center gap-1.5 text-amber-400 mb-1">
            <span>⚠️ Important Notice:</span>
          </div>
          <p class="text-sm leading-relaxed m-0">Always ensure floor-to-wall plumb level tolerances are checked before drilling shoe anchor points to prevent shear stress on door hinges.</p>
        </div><p></p>
      `;
      editor.chain().focus().insertContent(html).run();
    } else if (type === "critical") {
      const html = `
        <div class="border-l-4 border-rose-500 bg-rose-500/10 text-rose-200 p-4 rounded-r-2xl my-6 shadow-sm">
          <div class="font-bold flex items-center gap-1.5 text-rose-400 mb-1">
            <span>🛡️ Architectural Specification Standard:</span>
          </div>
          <p class="text-sm leading-relaxed m-0">Hardware fittings must be Grade 304 or 316 stainless steel with minimum 1.5mm wall gauge thickness to withstand continuous coastal or high-humidity environments without pitting.</p>
        </div><p></p>
      `;
      editor.chain().focus().insertContent(html).run();
    } else if (type === "cta") {
      const html = `
        <div class="border border-[#7FB706]/40 bg-gradient-to-r from-[#7FB706]/15 via-[#121226] to-[#7FB706]/10 p-6 rounded-2xl my-8 text-center shadow-2xl">
          <h4 class="text-xl font-bold text-white mb-2">Need a Custom Restroom Cubicle BOQ or Layout Drawing?</h4>
          <p class="text-sm text-gray-300 max-w-xl mx-auto mb-5 leading-relaxed">Pacific Products & Solutions provides factory-direct custom fabrication, computerized CNC cutting, and turnkey installation across all Indian states and GCC.</p>
          <a href="/contact" class="inline-flex items-center gap-2 px-6 py-3 bg-[#7FB706] hover:bg-[#6fa005] text-white font-bold rounded-xl text-sm shadow-lg shadow-[#7FB706]/20 transition">
            Request an Architectural BOQ Estimate &rarr;
          </a>
        </div><p></p>
      `;
      editor.chain().focus().insertContent(html).run();
    } else if (type === "spec-table") {
      const html = `
        <table class="w-full border-collapse my-6 rounded-xl overflow-hidden border border-white/20">
          <thead>
            <tr class="bg-white/10 text-white">
              <th class="p-3 border border-white/20 text-left font-bold text-sm">Specification Parameter</th>
              <th class="p-3 border border-white/20 text-left font-bold text-sm">Pacific Restroom Cubicle Standard</th>
              <th class="p-3 border border-white/20 text-left font-bold text-sm">Compliance Standard</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td class="p-3 border border-white/15 text-gray-200 text-sm font-semibold">Panel Core Substrate</td>
              <td class="p-3 border border-white/15 text-gray-300 text-sm">12mm Solid Compact Grade Laminate (HPL)</td>
              <td class="p-3 border border-white/15 text-[#7FB706] text-sm font-mono">EN 438-4 / IS:2046</td>
            </tr>
            <tr>
              <td class="p-3 border border-white/15 text-gray-200 text-sm font-semibold">Hardware Material</td>
              <td class="p-3 border border-white/15 text-gray-300 text-sm">Grade SS 304 Satin Stainless Steel</td>
              <td class="p-3 border border-white/15 text-[#7FB706] text-sm font-mono">ASTM A240</td>
            </tr>
            <tr>
              <td class="p-3 border border-white/15 text-gray-200 text-sm font-semibold">Standard Overall Height</td>
              <td class="p-3 border border-white/15 text-gray-300 text-sm">1980mm (including 100mm–150mm ground clearance)</td>
              <td class="p-3 border border-white/15 text-[#7FB706] text-sm font-mono">Universal Standard</td>
            </tr>
            <tr>
              <td class="p-3 border border-white/15 text-gray-200 text-sm font-semibold">Fire & Moisture Rating</td>
              <td class="p-3 border border-white/15 text-gray-300 text-sm">Class 1 Fire Retardant & 100% Water Resistant</td>
              <td class="p-3 border border-white/15 text-[#7FB706] text-sm font-mono">BS 476 Part 7</td>
            </tr>
          </tbody>
        </table><p></p>
      `;
      editor.chain().focus().insertContent(html).run();
    } else if (type === "pros-cons") {
      const html = `
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 my-6">
          <div class="p-5 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 space-y-2">
            <h5 class="text-sm font-bold text-emerald-400 flex items-center gap-1.5 uppercase tracking-wider">
              <span>✓ Primary Advantages</span>
            </h5>
            <ul class="text-xs text-gray-200 space-y-1.5 m-0 p-0 list-none">
              <li>• Completely impervious to steam, standing water, and direct chemical sprays</li>
              <li>• Scratch, graffiti, and impact resistant non-porous resin face</li>
              <li>• 10+ year expected lifecycle with minimal maintenance</li>
            </ul>
          </div>
          <div class="p-5 rounded-2xl bg-rose-500/10 border border-rose-500/25 space-y-2">
            <h5 class="text-sm font-bold text-rose-400 flex items-center gap-1.5 uppercase tracking-wider">
              <span>✕ Key Considerations</span>
            </h5>
            <ul class="text-xs text-gray-200 space-y-1.5 m-0 p-0 list-none">
              <li>• Higher initial procurement cost compared to particle board alternatives</li>
              <li>• Requires specialized diamond-tipped CNC tooling for on-site trimming</li>
              <li>• Substantial self-weight requiring secure structural masonry anchoring</li>
            </ul>
          </div>
        </div><p></p>
      `;
      editor.chain().focus().insertContent(html).run();
    } else if (type === "metrics") {
      const html = `
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 my-6 text-center">
          <div class="p-4 rounded-xl bg-white/5 border border-white/10">
            <div class="text-2xl font-black text-[#B5F823] font-mono">10+ Years</div>
            <div class="text-xs text-gray-400 mt-1">Design Lifespan Warranty</div>
          </div>
          <div class="p-4 rounded-xl bg-white/5 border border-white/10">
            <div class="text-2xl font-black text-[#7FB706] font-mono">100%</div>
            <div class="text-xs text-gray-400 mt-1">Moisture & Steam Proof</div>
          </div>
          <div class="p-4 rounded-xl bg-white/5 border border-white/10">
            <div class="text-2xl font-black text-sky-400 font-mono">IS:2046</div>
            <div class="text-xs text-gray-400 mt-1">Certified Architecture</div>
          </div>
        </div><p></p>
      `;
      editor.chain().focus().insertContent(html).run();
    } else if (type === "faq") {
      const html = `
        <details class="group border border-white/15 bg-white/5 rounded-xl p-4 my-3 cursor-pointer">
          <summary class="text-sm font-bold text-white flex items-center justify-between list-none">
            <span>What makes 12mm Compact Laminate superior to conventional wooden partitions?</span>
            <span class="text-gray-400 group-open:rotate-180 transition-transform">▼</span>
          </summary>
          <div class="text-xs text-gray-300 mt-3 pt-3 border-t border-white/10 leading-relaxed">
            Compact Grade Laminate is manufactured using multiple layers of thermosetting kraft papers fused under intense heat (> 140°C) and pressure (> 9 MPa). Unlike conventional particle boards or plywood, it contains no internal voids or moisture-sensitive wood chips, preventing swelling, delamination, or microbial mold growth indefinitely.
          </div>
        </details><p></p>
      `;
      editor.chain().focus().insertContent(html).run();
    }

    setShowComponentMenu(false);
  };

  // Find & Replace Execution
  const handleFind = () => {
    if (!editor || !searchTerm.trim()) {
      setMatchCount(0);
      return;
    }
    const text = editor.getText();
    const regex = new RegExp(searchTerm.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi");
    const matches = text.match(regex);
    setMatchCount(matches ? matches.length : 0);
  };

  const handleReplaceAll = () => {
    if (!editor || !searchTerm.trim()) return;
    const currentHtml = editor.getHTML();
    const regex = new RegExp(searchTerm.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g");
    const newHtml = currentHtml.replace(regex, replaceTerm);
    editor.commands.setContent(newHtml);
    setMatchCount(0);
    alert(`Replaced all occurrences of "${searchTerm}".`);
  };

  // Export Tools
  const handleCopyHtml = async () => {
    if (!editor) return;
    try {
      await navigator.clipboard.writeText(editor.getHTML());
      setCopiedNotification(true);
      setTimeout(() => setCopiedNotification(false), 2000);
    } catch {
      alert("Failed to copy HTML to clipboard.");
    }
  };

  const handleDownloadMarkdown = () => {
    if (!editor) return;
    const text = editor.getText();
    const blob = new Blob([text], { type: "text/markdown;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `article-${Date.now()}.md`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handlePrintDocument = () => {
    if (!editor) return;
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Document Print</title>
          <style>
            body { font-family: system-ui, -apple-system, sans-serif; line-height: 1.6; padding: 40px; color: #111; }
            h1, h2, h3, h4 { color: #000; font-weight: 700; }
            table { width: 100%; border-collapse: collapse; margin: 20px 0; }
            th, td { border: 1px solid #ccc; padding: 8px 12px; text-align: left; }
            th { background: #f4f4f4; }
            blockquote { border-left: 4px solid #7FB706; margin: 20px 0; padding: 10px 20px; font-style: italic; background: #fbfbfb; }
            img { max-width: 100%; height: auto; border-radius: 8px; margin: 20px 0; }
          </style>
        </head>
        <body>
          ${editor.getHTML()}
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 300);
  };

  if (!editor) {
    return (
      <div className="h-96 rounded-2xl bg-[#0a0a1a] border border-white/10 flex items-center justify-center text-gray-400">
        Loading Word Processor...
      </div>
    );
  }

  const editorDom = (
    <div
      ref={containerRef}
      className={`relative rounded-2xl border border-white/10 bg-[#0a0a1a] transition-all flex flex-col min-w-0 max-w-full ${
        viewMode === "ZEN"
          ? "fixed inset-0 z-[9999] rounded-none border-none w-full h-full bg-[#070716] overflow-hidden"
          : "min-h-[560px] overflow-hidden"
      } ${className}`}
    >
      {/* ── Zen Mode Dedicated Top Header Bar ───────────────────────────────── */}
      {viewMode === "ZEN" && (
        <div className="flex items-center justify-between border-b border-white/10 bg-[#0c0c1e] px-4 py-2.5 z-30 shrink-0">
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => setViewMode("PAGE")}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 text-xs font-semibold border border-amber-500/30 transition cursor-pointer"
              title="Exit Zen Fullscreen (Esc)"
            >
              <Minimize2 className="w-3.5 h-3.5" />
              <span>Exit Zen Mode (Esc)</span>
            </button>
            <span className="text-gray-600 hidden sm:inline">•</span>
            <span className="text-xs text-gray-300 font-medium hidden sm:inline">
              Zen Distraction-Free Word Studio
            </span>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs font-mono text-[#7FB706]">
              {editor.storage.characterCount?.words?.() || 0} words
            </span>
            <button
              type="button"
              onClick={() => setViewMode("PAGE")}
              className="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
              title="Close Zen Fullscreen"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ── Word Ribbon Toolbar ─────────────────────────────────────────────────── */}
      <div className="sticky top-0 z-20 flex items-center gap-0.5 sm:gap-1 border-b border-white/10 bg-[#121226]/95 p-[5px] sm:p-2 backdrop-blur-md overflow-x-auto no-scrollbar max-w-full flex-nowrap shrink-0 m-0">
        {/* Undo / Redo */}
        <div className="flex items-center border-r border-white/10 pr-1.5 mr-1 gap-0.5">
          <button
            type="button"
            onClick={() => editor.chain().focus().undo().run()}
            disabled={!editor.can().undo()}
            className="p-1.5 rounded-lg text-gray-400 hover:bg-white/10 hover:text-white disabled:opacity-30"
            title="Undo (Ctrl+Z)"
          >
            <Undo2 className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().redo().run()}
            disabled={!editor.can().redo()}
            className="p-1.5 rounded-lg text-gray-400 hover:bg-white/10 hover:text-white disabled:opacity-30"
            title="Redo (Ctrl+Y)"
          >
            <Redo2 className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().clearNodes().unsetAllMarks().run()}
            className="p-1.5 rounded-lg text-gray-400 hover:bg-white/10 hover:text-white"
            title="Clear All Formatting (Format Eraser)"
          >
            <Eraser className="w-4 h-4" />
          </button>
        </div>

        {/* Font Family Selector */}
        <div className="flex items-center border-r border-white/10 pr-1.5 mr-1">
          <select
            value={fontFamily}
            onChange={(e) => setFontFamily(e.target.value as FontFamily)}
            className="bg-[#0a0a1a] border border-white/10 rounded-lg px-2 py-1 text-xs text-gray-200 focus:outline-none focus:border-[#7FB706]"
            title="Font Family"
          >
            <option value="sans">Modern Sans (Inter)</option>
            <option value="serif">Editorial Serif</option>
            <option value="mono">Technical Mono</option>
          </select>
        </div>

        {/* Heading & Block Styles */}
        <div className="flex items-center border-r border-white/10 pr-1.5 mr-1 gap-0.5">
          <button
            type="button"
            onClick={() => editor.chain().focus().setParagraph().run()}
            className={`px-2 py-1 rounded-lg text-xs font-semibold ${
              editor.isActive("paragraph")
                ? "bg-[#7FB706]/20 text-[#B5F823]"
                : "text-gray-400 hover:bg-white/10 hover:text-white"
            }`}
            title="Normal Paragraph"
          >
            P
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
            className={`p-1.5 rounded-lg ${
              editor.isActive("heading", { level: 1 })
                ? "bg-[#7FB706]/20 text-[#B5F823]"
                : "text-gray-400 hover:bg-white/10 hover:text-white"
            }`}
            title="Heading 1 (H1)"
          >
            <Heading1 className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            className={`p-1.5 rounded-lg ${
              editor.isActive("heading", { level: 2 })
                ? "bg-[#7FB706]/20 text-[#B5F823]"
                : "text-gray-400 hover:bg-white/10 hover:text-white"
            }`}
            title="Heading 2 (H2)"
          >
            <Heading2 className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
            className={`p-1.5 rounded-lg ${
              editor.isActive("heading", { level: 3 })
                ? "bg-[#7FB706]/20 text-[#B5F823]"
                : "text-gray-400 hover:bg-white/10 hover:text-white"
            }`}
            title="Heading 3 (H3)"
          >
            <Heading3 className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleHeading({ level: 4 }).run()}
            className={`p-1.5 rounded-lg ${
              editor.isActive("heading", { level: 4 })
                ? "bg-[#7FB706]/20 text-[#B5F823]"
                : "text-gray-400 hover:bg-white/10 hover:text-white"
            }`}
            title="Heading 4 (H4)"
          >
            <Heading4 className="w-4 h-4" />
          </button>
        </div>

        {/* Character Formatting (B, I, U, S, Sub, Sup, Code) */}
        <div className="flex items-center border-r border-white/10 pr-1.5 mr-1 gap-0.5">
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleBold().run()}
            className={`p-1.5 rounded-lg ${
              editor.isActive("bold") ? "bg-[#7FB706]/20 text-[#B5F823]" : "text-gray-400 hover:bg-white/10 hover:text-white"
            }`}
            title="Bold (Ctrl+B)"
          >
            <Bold className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleItalic().run()}
            className={`p-1.5 rounded-lg ${
              editor.isActive("italic") ? "bg-[#7FB706]/20 text-[#B5F823]" : "text-gray-400 hover:bg-white/10 hover:text-white"
            }`}
            title="Italic (Ctrl+I)"
          >
            <Italic className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleUnderline().run()}
            className={`p-1.5 rounded-lg ${
              editor.isActive("underline")
                ? "bg-[#7FB706]/20 text-[#B5F823]"
                : "text-gray-400 hover:bg-white/10 hover:text-white"
            }`}
            title="Underline (Ctrl+U)"
          >
            <UnderlineIcon className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleStrike().run()}
            className={`p-1.5 rounded-lg ${
              editor.isActive("strike")
                ? "bg-[#7FB706]/20 text-[#B5F823]"
                : "text-gray-400 hover:bg-white/10 hover:text-white"
            }`}
            title="Strikethrough"
          >
            <Strikethrough className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleSubscript().run()}
            className={`p-1.5 rounded-lg ${
              editor.isActive("subscript")
                ? "bg-[#7FB706]/20 text-[#B5F823]"
                : "text-gray-400 hover:bg-white/10 hover:text-white"
            }`}
            title="Subscript (e.g. H₂O)"
          >
            <SubIcon className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleSuperscript().run()}
            className={`p-1.5 rounded-lg ${
              editor.isActive("superscript")
                ? "bg-[#7FB706]/20 text-[#B5F823]"
                : "text-gray-400 hover:bg-white/10 hover:text-white"
            }`}
            title="Superscript (e.g. m², 1st)"
          >
            <SupIcon className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleCode().run()}
            className={`p-1.5 rounded-lg ${
              editor.isActive("code") ? "bg-[#7FB706]/20 text-[#B5F823]" : "text-gray-400 hover:bg-white/10 hover:text-white"
            }`}
            title="Inline Code"
          >
            <Code className="w-4 h-4" />
          </button>

          {/* Text Color Popover */}
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setShowColorPopover(!showColorPopover);
                setShowHighlightPopover(false);
              }}
              className="p-1.5 rounded-lg text-gray-400 hover:bg-white/10 hover:text-white flex items-center gap-0.5"
              title="Font Color"
            >
              <Palette className="w-4 h-4 text-emerald-400" />
            </button>
            {showColorPopover && (
              <div className="absolute left-0 top-full mt-1 z-30 bg-[#121226] border border-white/15 rounded-xl p-2.5 shadow-2xl w-44 space-y-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Text Color</span>
                <div className="grid grid-cols-4 gap-1.5">
                  {COLOR_PALETTE.map((c) => (
                    <button
                      key={c.name}
                      type="button"
                      onClick={() => {
                        editor.chain().focus().setColor(c.color).run();
                        setShowColorPopover(false);
                      }}
                      className="w-7 h-7 rounded-lg border border-white/20 transition-transform hover:scale-110 flex items-center justify-center"
                      style={{ backgroundColor: c.color }}
                      title={c.name}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Highlight Marker Popover */}
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setShowHighlightPopover(!showHighlightPopover);
                setShowColorPopover(false);
              }}
              className="p-1.5 rounded-lg text-gray-400 hover:bg-white/10 hover:text-white"
              title="Highlight Text Marker"
            >
              <Highlighter className="w-4 h-4 text-amber-300" />
            </button>
            {showHighlightPopover && (
              <div className="absolute left-0 top-full mt-1 z-30 bg-[#121226] border border-white/15 rounded-xl p-2.5 shadow-2xl w-44 space-y-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Highlight Marker</span>
                <div className="grid grid-cols-3 gap-1.5">
                  {HIGHLIGHT_PALETTE.map((h) => (
                    <button
                      key={h.name}
                      type="button"
                      onClick={() => {
                        if (!h.color) {
                          editor.chain().focus().unsetHighlight().run();
                        } else {
                          editor.chain().focus().setHighlight({ color: h.color }).run();
                        }
                        setShowHighlightPopover(false);
                      }}
                      className="px-2 py-1 text-[10px] rounded-lg border border-white/20 text-white truncate"
                      style={{ backgroundColor: h.color || "transparent" }}
                      title={h.name}
                    >
                      {h.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Alignment */}
        <div className="flex items-center border-r border-white/10 pr-1.5 mr-1 gap-0.5">
          <button
            type="button"
            onClick={() => editor.chain().focus().setTextAlign("left").run()}
            className={`p-1.5 rounded-lg ${
              editor.isActive({ textAlign: "left" })
                ? "bg-[#7FB706]/20 text-[#B5F823]"
                : "text-gray-400 hover:bg-white/10 hover:text-white"
            }`}
            title="Align Left"
          >
            <AlignLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().setTextAlign("center").run()}
            className={`p-1.5 rounded-lg ${
              editor.isActive({ textAlign: "center" })
                ? "bg-[#7FB706]/20 text-[#B5F823]"
                : "text-gray-400 hover:bg-white/10 hover:text-white"
            }`}
            title="Align Center"
          >
            <AlignCenter className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().setTextAlign("right").run()}
            className={`p-1.5 rounded-lg ${
              editor.isActive({ textAlign: "right" })
                ? "bg-[#7FB706]/20 text-[#B5F823]"
                : "text-gray-400 hover:bg-white/10 hover:text-white"
            }`}
            title="Align Right"
          >
            <AlignRight className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().setTextAlign("justify").run()}
            className={`p-1.5 rounded-lg ${
              editor.isActive({ textAlign: "justify" })
                ? "bg-[#7FB706]/20 text-[#B5F823]"
                : "text-gray-400 hover:bg-white/10 hover:text-white"
            }`}
            title="Justify"
          >
            <AlignJustify className="w-4 h-4" />
          </button>
        </div>

        {/* Lists & Quotes */}
        <div className="flex items-center border-r border-white/10 pr-1.5 mr-1 gap-0.5">
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            className={`p-1.5 rounded-lg ${
              editor.isActive("bulletList")
                ? "bg-[#7FB706]/20 text-[#B5F823]"
                : "text-gray-400 hover:bg-white/10 hover:text-white"
            }`}
            title="Bullet List (Ctrl+Shift+8)"
          >
            <List className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            className={`p-1.5 rounded-lg ${
              editor.isActive("orderedList")
                ? "bg-[#7FB706]/20 text-[#B5F823]"
                : "text-gray-400 hover:bg-white/10 hover:text-white"
            }`}
            title="Numbered List (Ctrl+Shift+7)"
          >
            <ListOrdered className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
            className={`p-1.5 rounded-lg ${
              editor.isActive("blockquote")
                ? "bg-[#7FB706]/20 text-[#B5F823]"
                : "text-gray-400 hover:bg-white/10 hover:text-white"
            }`}
            title="Blockquote"
          >
            <Quote className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().setHorizontalRule().run()}
            className="p-1.5 rounded-lg text-gray-400 hover:bg-white/10 hover:text-white"
            title="Horizontal Divider"
          >
            <Minus className="w-4 h-4" />
          </button>
        </div>

        {/* Links, Media & Tables */}
        <div className="flex items-center border-r border-white/10 pr-1.5 mr-1 gap-0.5">
          <button
            type="button"
            onClick={handleOpenLinkModal}
            className={`p-1.5 rounded-lg ${
              editor.isActive("link") ? "bg-[#7FB706]/20 text-[#B5F823]" : "text-gray-400 hover:bg-white/10 hover:text-white"
            }`}
            title="Insert Link (Ctrl+K)"
          >
            <LinkIcon className="w-4 h-4" />
          </button>
          {editor.isActive("link") && (
            <button
              type="button"
              onClick={() => editor.chain().focus().unsetLink().run()}
              className="p-1.5 rounded-lg text-red-400 hover:bg-red-500/10"
              title="Remove Link"
            >
              <Unlink className="w-4 h-4" />
            </button>
          )}

          <button
            type="button"
            onClick={() => setShowImageModal(true)}
            className="p-1.5 rounded-lg text-gray-400 hover:bg-white/10 hover:text-white"
            title="Insert Article Image"
          >
            <ImageIcon className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => setShowVideoModal(true)}
            className="p-1.5 rounded-lg text-gray-400 hover:bg-white/10 hover:text-white"
            title="Embed YouTube or Vimeo Video"
          >
            <Video className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => setShowTableModal(true)}
            className={`p-1.5 rounded-lg ${
              editor.isActive("table")
                ? "bg-[#7FB706]/20 text-[#B5F823]"
                : "text-gray-400 hover:bg-white/10 hover:text-white"
            }`}
            title="Insert Structured Table"
          >
            <TableIcon className="w-4 h-4" />
          </button>
        </div>

        {/* Real-World Component Presets Menu */}
        <div className="relative border-r border-white/10 pr-1.5 mr-1">
          <button
            type="button"
            onClick={() => setShowComponentMenu(!showComponentMenu)}
            className="px-2.5 py-1 rounded-lg text-xs font-bold bg-[#7FB706]/15 hover:bg-[#7FB706]/25 text-[#B5F823] flex items-center gap-1.5 border border-[#7FB706]/30"
            title="Insert Pre-formatted Architectural & Blog Component"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Insert Block</span>
            <ChevronDown className="w-3 h-3" />
          </button>

          {showComponentMenu && (
            <div className="absolute left-0 top-full mt-1.5 z-30 w-72 bg-[#121226] border border-white/15 rounded-2xl p-2 shadow-2xl space-y-1">
              <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400 px-2 py-1">
                Visual Content Presets
              </div>
              <button
                type="button"
                onClick={() => insertComponentPreset("tip")}
                className="w-full text-left px-3 py-2 rounded-xl text-xs hover:bg-white/5 flex items-center gap-2 text-emerald-300"
              >
                <Info className="w-4 h-4 shrink-0" />
                <div>
                  <div className="font-semibold text-white">Pro Tip Callout</div>
                  <div className="text-[10px] text-gray-400">Green highlight advice container</div>
                </div>
              </button>
              <button
                type="button"
                onClick={() => insertComponentPreset("warning")}
                className="w-full text-left px-3 py-2 rounded-xl text-xs hover:bg-white/5 flex items-center gap-2 text-amber-300"
              >
                <AlertCircle className="w-4 h-4 shrink-0" />
                <div>
                  <div className="font-semibold text-white">Notice / Warning Callout</div>
                  <div className="text-[10px] text-gray-400">Amber architectural caution banner</div>
                </div>
              </button>
              <button
                type="button"
                onClick={() => insertComponentPreset("critical")}
                className="w-full text-left px-3 py-2 rounded-xl text-xs hover:bg-white/5 flex items-center gap-2 text-rose-300"
              >
                <AlertCircle className="w-4 h-4 shrink-0" />
                <div>
                  <div className="font-semibold text-white">Specification Standard</div>
                  <div className="text-[10px] text-gray-400">Red IS/ASTM standard alert box</div>
                </div>
              </button>
              <button
                type="button"
                onClick={() => insertComponentPreset("cta")}
                className="w-full text-left px-3 py-2 rounded-xl text-xs hover:bg-white/5 flex items-center gap-2 text-[#B5F823]"
              >
                <CheckCircle className="w-4 h-4 shrink-0" />
                <div>
                  <div className="font-semibold text-white">Project Quote CTA Banner</div>
                  <div className="text-[10px] text-gray-400">High-converting commercial proposal card</div>
                </div>
              </button>
              <button
                type="button"
                onClick={() => insertComponentPreset("spec-table")}
                className="w-full text-left px-3 py-2 rounded-xl text-xs hover:bg-white/5 flex items-center gap-2 text-sky-300"
              >
                <Columns className="w-4 h-4 shrink-0" />
                <div>
                  <div className="font-semibold text-white">Pacific Spec Table Preset</div>
                  <div className="text-[10px] text-gray-400">Pre-filled EN 438 cubicle technical table</div>
                </div>
              </button>
              <button
                type="button"
                onClick={() => insertComponentPreset("pros-cons")}
                className="w-full text-left px-3 py-2 rounded-xl text-xs hover:bg-white/5 flex items-center gap-2 text-purple-300"
              >
                <LayoutTemplate className="w-4 h-4 shrink-0" />
                <div>
                  <div className="font-semibold text-white">Pros & Cons Grid</div>
                  <div className="text-[10px] text-gray-400">2-column product comparison matrix</div>
                </div>
              </button>
              <button
                type="button"
                onClick={() => insertComponentPreset("metrics")}
                className="w-full text-left px-3 py-2 rounded-xl text-xs hover:bg-white/5 flex items-center gap-2 text-amber-200"
              >
                <BarChart3 className="w-4 h-4 shrink-0" />
                <div>
                  <div className="font-semibold text-white">3-Metric Highlight Grid</div>
                  <div className="text-[10px] text-gray-400">Warranty, resistance & certification cards</div>
                </div>
              </button>
              <button
                type="button"
                onClick={() => insertComponentPreset("faq")}
                className="w-full text-left px-3 py-2 rounded-xl text-xs hover:bg-white/5 flex items-center gap-2 text-gray-300"
              >
                <HelpCircle className="w-4 h-4 shrink-0" />
                <div>
                  <div className="font-semibold text-white">Collapsible FAQ Accordion</div>
                  <div className="text-[10px] text-gray-400">Interactive expandable Q&A container</div>
                </div>
              </button>
            </div>
          )}
        </div>

        {/* Table Contextual Controls (visible when cursor is inside a table) */}
        {editor.isActive("table") && (
          <div className="flex items-center gap-0.5 border-r border-white/10 pr-1.5 mr-1 bg-white/5 rounded-lg px-1.5 py-0.5">
            <button
              type="button"
              onClick={() => editor.chain().focus().addRowAfter().run()}
              className="px-1.5 py-0.5 text-[10px] text-gray-300 hover:text-white bg-white/10 rounded"
              title="Add Row Below"
            >
              +Row
            </button>
            <button
              type="button"
              onClick={() => editor.chain().focus().deleteRow().run()}
              className="px-1.5 py-0.5 text-[10px] text-red-300 hover:text-red-200 bg-red-500/20 rounded"
              title="Delete Row"
            >
              -Row
            </button>
            <button
              type="button"
              onClick={() => editor.chain().focus().addColumnAfter().run()}
              className="px-1.5 py-0.5 text-[10px] text-gray-300 hover:text-white bg-white/10 rounded"
              title="Add Column Right"
            >
              +Col
            </button>
            <button
              type="button"
              onClick={() => editor.chain().focus().deleteColumn().run()}
              className="px-1.5 py-0.5 text-[10px] text-red-300 hover:text-red-200 bg-red-500/20 rounded"
              title="Delete Column"
            >
              -Col
            </button>
            <button
              type="button"
              onClick={() => editor.chain().focus().deleteTable().run()}
              className="p-1 text-red-400 hover:text-red-300"
              title="Delete Entire Table"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Word Tools (Find, Shortcuts, Export) */}
        <div className="flex items-center gap-1 border-r border-white/10 pr-1.5 mr-1">
          <button
            type="button"
            onClick={() => setShowFindReplaceModal(true)}
            className="p-1.5 rounded-lg text-gray-400 hover:bg-white/10 hover:text-white"
            title="Find and Replace (Ctrl+F)"
          >
            <Search className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => setShowShortcutsModal(true)}
            className="p-1.5 rounded-lg text-gray-400 hover:bg-white/10 hover:text-white"
            title="Keyboard Shortcuts Cheatsheet (Ctrl+/)"
          >
            <HelpCircle className="w-4 h-4" />
          </button>
        </div>

        {/* View Mode Switcher (Page Mode / Fluid Mode / Zen Mode) */}
        <div className="flex items-center gap-1 bg-[#0a0a1a] p-0.5 rounded-xl border border-white/10">
          <button
            type="button"
            onClick={() => setViewMode("PAGE")}
            className={`px-2 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 transition ${
              viewMode === "PAGE" ? "bg-[#7FB706] text-white shadow" : "text-gray-400 hover:text-white"
            }`}
            title="Word Page Mode (A4 Sheet layout with margins)"
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Page</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode("FLUID")}
            className={`px-2 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 transition ${
              viewMode === "FLUID" ? "bg-[#7FB706] text-white shadow" : "text-gray-400 hover:text-white"
            }`}
            title="Fluid Canvas Mode (100% full width)"
          >
            <Monitor className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Fluid</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode(viewMode === "ZEN" ? "PAGE" : "ZEN")}
            className={`p-1.5 rounded-lg transition ${
              viewMode === "ZEN" ? "bg-amber-500 text-black shadow" : "text-gray-400 hover:text-white"
            }`}
            title={viewMode === "ZEN" ? "Exit Zen Mode (Esc)" : "Zen Distraction-Free Mode"}
          >
            {viewMode === "ZEN" ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>

        {/* Quick Export Tools */}
        <div className="ml-auto flex items-center gap-1">
          <button
            type="button"
            onClick={handleCopyHtml}
            className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white flex items-center gap-1"
            title="Copy Clean HTML to clipboard"
          >
            {copiedNotification ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span className="hidden lg:inline">{copiedNotification ? "Copied!" : "HTML"}</span>
          </button>
          <button
            type="button"
            onClick={handleDownloadMarkdown}
            className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white flex items-center gap-1"
            title="Download Markdown (.md) file"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden lg:inline">MD</span>
          </button>
          <button
            type="button"
            onClick={handlePrintDocument}
            className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white flex items-center gap-1"
            title="Print Document or Save as PDF"
          >
            <Printer className="w-3.5 h-3.5" />
            <span className="hidden lg:inline">Print</span>
          </button>
        </div>
      </div>

      {/* ── Editor Canvas Sheet ──────────────────────────────────────────────── */}
      <div
        className={`flex-1 overflow-y-auto ${
          viewMode === "PAGE"
            ? "p-[5px] sm:py-6 sm:px-4 bg-[#070716] flex justify-center m-0"
            : viewMode === "ZEN"
            ? "p-[5px] sm:py-8 sm:px-8 max-w-4xl mx-auto w-full m-0"
            : "p-[5px] sm:p-6 m-0"
        }`}
      >
        <div
          className={`${
            viewMode === "PAGE"
              ? "w-full max-w-3xl rounded-xl sm:rounded-2xl bg-[#0f0f23] border border-white/10 shadow-2xl p-[5px] sm:p-8 lg:p-12 min-h-[350px] sm:min-h-[640px] m-0"
              : "w-full p-[5px] sm:p-0 m-0"
          } ${
            fontFamily === "serif"
              ? "font-serif text-[14px] sm:text-lg leading-snug sm:leading-relaxed"
              : fontFamily === "mono"
              ? "font-mono text-[12px] sm:text-sm leading-snug sm:leading-relaxed"
              : "font-sans text-[13px] sm:text-base leading-snug sm:leading-relaxed"
          } min-w-0 max-w-full overflow-hidden`}
        >
          <EditorContent editor={editor} />
        </div>
      </div>

      {/* ── Real Word Status Bar ─────────────────────────────────────────────── */}
      <div className="flex flex-wrap sm:flex-nowrap items-center justify-between gap-1.5 sm:gap-3 border-t border-white/10 bg-[#121226] p-[5px] sm:px-4 sm:py-2 text-[10px] sm:text-xs text-gray-400 select-none m-0 overflow-x-auto no-scrollbar">
        <div className="flex items-center gap-2 sm:gap-4 shrink-0">
          <span className="font-mono text-white font-semibold flex items-center gap-1">
            <FileText className="w-3.5 h-3.5 text-[#7FB706]" />
            {stats.words.toLocaleString()} words
          </span>
          <span className="text-gray-500 font-mono hidden xs:inline">
            {stats.characters.toLocaleString()} chars
          </span>
          <span className="text-gray-500 font-mono hidden md:inline">
            {stats.paragraphs} paras
          </span>
        </div>

        <div className="flex items-center gap-2 sm:gap-4 shrink-0">
          <span className="text-gray-400 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            {stats.readingTime}
          </span>
          <span className="px-1.5 py-0.5 rounded text-[9px] sm:text-[10px] font-mono font-bold uppercase bg-white/5 border border-white/10 text-gray-300">
            {readabilityGrade}
          </span>
          <span className="text-gray-500 font-mono text-[10px] sm:text-[11px] uppercase hidden sm:inline">
            {fontFamily} • {viewMode}
          </span>
        </div>
      </div>

      {/* ── Find and Replace Modal ───────────────────────────────────────────── */}
      {showFindReplaceModal && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#121226] p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Search className="w-4 h-4 text-[#7FB706]" /> Find & Replace in Article
              </h3>
              <button
                type="button"
                onClick={() => setShowFindReplaceModal(false)}
                className="text-gray-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-1">Find text</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleFind()}
                  placeholder="e.g. partition"
                  className="flex-1 rounded-xl border border-white/10 bg-[#0a0a1a] px-3 py-2 text-sm text-white focus:border-[#7FB706] focus:outline-none"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={handleFind}
                  className="px-3 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-semibold"
                >
                  Count
                </button>
              </div>
              {matchCount !== null && (
                <p className="text-xs text-[#B5F823] mt-1 font-mono">
                  Found {matchCount} occurrence{matchCount === 1 ? "" : "s"}
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-1">Replace with</label>
              <input
                type="text"
                value={replaceTerm}
                onChange={(e) => setReplaceTerm(e.target.value)}
                placeholder="e.g. restroom cubicle"
                className="w-full rounded-xl border border-white/10 bg-[#0a0a1a] px-3 py-2 text-sm text-white focus:border-[#7FB706] focus:outline-none"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-white/10">
              <button
                type="button"
                onClick={() => setShowFindReplaceModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-400 hover:bg-white/5 hover:text-white"
              >
                Close
              </button>
              <button
                type="button"
                onClick={handleReplaceAll}
                disabled={!searchTerm.trim()}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-[#7FB706] text-white hover:bg-[#6fa005] disabled:opacity-40"
              >
                Replace All
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Keyboard Shortcuts Modal ────────────────────────────────────────── */}
      {showShortcutsModal && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-[#121226] p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-[#7FB706]" /> Real-Word Keyboard Shortcuts
              </h3>
              <button
                type="button"
                onClick={() => setShowShortcutsModal(false)}
                className="text-gray-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="space-y-2">
                <div className="text-[11px] font-bold text-gray-400 uppercase">Text Formatting</div>
                <div className="flex justify-between py-1 border-b border-white/5">
                  <span className="text-gray-300">Bold</span>
                  <kbd className="font-mono bg-white/10 px-1.5 py-0.5 rounded text-white">Ctrl + B</kbd>
                </div>
                <div className="flex justify-between py-1 border-b border-white/5">
                  <span className="text-gray-300">Italic</span>
                  <kbd className="font-mono bg-white/10 px-1.5 py-0.5 rounded text-white">Ctrl + I</kbd>
                </div>
                <div className="flex justify-between py-1 border-b border-white/5">
                  <span className="text-gray-300">Underline</span>
                  <kbd className="font-mono bg-white/10 px-1.5 py-0.5 rounded text-white">Ctrl + U</kbd>
                </div>
                <div className="flex justify-between py-1 border-b border-white/5">
                  <span className="text-gray-300">Insert Link</span>
                  <kbd className="font-mono bg-white/10 px-1.5 py-0.5 rounded text-white">Ctrl + K</kbd>
                </div>
                <div className="flex justify-between py-1 border-b border-white/5">
                  <span className="text-gray-300">Inline Code</span>
                  <kbd className="font-mono bg-white/10 px-1.5 py-0.5 rounded text-white">Ctrl + E</kbd>
                </div>
              </div>

              <div className="space-y-2">
                <div className="text-[11px] font-bold text-gray-400 uppercase">Blocks & Tools</div>
                <div className="flex justify-between py-1 border-b border-white/5">
                  <span className="text-gray-300">Bullet List</span>
                  <kbd className="font-mono bg-white/10 px-1.5 py-0.5 rounded text-white">Ctrl+Shift+8</kbd>
                </div>
                <div className="flex justify-between py-1 border-b border-white/5">
                  <span className="text-gray-300">Numbered List</span>
                  <kbd className="font-mono bg-white/10 px-1.5 py-0.5 rounded text-white">Ctrl+Shift+7</kbd>
                </div>
                <div className="flex justify-between py-1 border-b border-white/5">
                  <span className="text-gray-300">Find & Replace</span>
                  <kbd className="font-mono bg-white/10 px-1.5 py-0.5 rounded text-white">Ctrl + F</kbd>
                </div>
                <div className="flex justify-between py-1 border-b border-white/5">
                  <span className="text-gray-300">Heading 1/2/3</span>
                  <kbd className="font-mono bg-white/10 px-1.5 py-0.5 rounded text-white"># / ## / ###</kbd>
                </div>
                <div className="flex justify-between py-1 border-b border-white/5">
                  <span className="text-gray-300">Exit Zen Mode</span>
                  <kbd className="font-mono bg-white/10 px-1.5 py-0.5 rounded text-white">Escape</kbd>
                </div>
              </div>
            </div>

            <div className="text-right pt-2 border-t border-white/10">
              <button
                type="button"
                onClick={() => setShowShortcutsModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-[#7FB706] text-white hover:bg-[#6fa005]"
              >
                Got It
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Link Modal ─────────────────────────────────────────────────────── */}
      {showLinkModal && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#121226] p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-white">Insert Hyperlink</h3>
            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-1.5">Destination URL</label>
              <input
                type="text"
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                placeholder="https://example.com or /products/restroom-cubicles"
                className="w-full rounded-xl border border-white/10 bg-[#0a0a1a] px-3.5 py-2.5 text-sm text-white placeholder-gray-500 focus:border-[#7FB706] focus:outline-none"
                autoFocus
              />
            </div>
            <label className="flex items-center gap-2 text-xs text-gray-300 cursor-pointer">
              <input
                type="checkbox"
                checked={linkOpenNewTab}
                onChange={(e) => setLinkOpenNewTab(e.target.checked)}
                className="rounded border-white/20 bg-[#0a0a1a] text-[#7FB706] focus:ring-0"
              />
              Open in new browser tab (target="_blank", rel="noopener noreferrer")
            </label>
            <div className="flex justify-end gap-2 pt-2 border-t border-white/10">
              <button
                type="button"
                onClick={() => setShowLinkModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-400 hover:bg-white/5 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleApplyLink}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-[#7FB706] text-white hover:bg-[#6fa005]"
              >
                Apply Link
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Image Modal ────────────────────────────────────────────────────── */}
      {showImageModal && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#121226] p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-white">Insert Article Image</h3>
            <div className="border-2 border-dashed border-white/15 rounded-2xl p-5 text-center hover:border-[#7FB706]/50 transition-colors">
              <input
                type="file"
                ref={fileInputRef}
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
                id="tiptap-img-upload"
              />
              <label
                htmlFor="tiptap-img-upload"
                className="cursor-pointer flex flex-col items-center justify-center gap-2 text-sm text-gray-300"
              >
                <Upload className="w-6 h-6 text-[#7FB706]" />
                <span>{isUploadingImage ? "Uploading to ImageKit CDN..." : "Upload from Computer (WebP / PNG / JPG)"}</span>
                <span className="text-[11px] text-gray-500">Fast global CDN delivery</span>
              </label>
            </div>

            <div className="flex items-center gap-3">
              <div className="h-px flex-1 bg-white/10" />
              <span className="text-xs text-gray-500 uppercase">Or image URL</span>
              <div className="h-px flex-1 bg-white/10" />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-1">Direct Image URL</label>
              <input
                type="text"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="https://..."
                className="w-full rounded-xl border border-white/10 bg-[#0a0a1a] px-3.5 py-2 text-sm text-white focus:border-[#7FB706] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-1">Alt Text (SEO Important)</label>
              <input
                type="text"
                value={imageAlt}
                onChange={(e) => setImageAlt(e.target.value)}
                placeholder="e.g. Commercial restroom cubicle installation"
                className="w-full rounded-xl border border-white/10 bg-[#0a0a1a] px-3.5 py-2 text-sm text-white focus:border-[#7FB706] focus:outline-none"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-white/10">
              <button
                type="button"
                onClick={() => setShowImageModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-400 hover:bg-white/5 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleApplyUrlImage}
                disabled={!imageUrl.trim()}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-[#7FB706] text-white hover:bg-[#6fa005] disabled:opacity-40"
              >
                Insert Image
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Video Modal ────────────────────────────────────────────────────── */}
      {showVideoModal && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#121226] p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-white">Embed Video</h3>
            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-1.5">YouTube or Vimeo URL</label>
              <input
                type="text"
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
                placeholder="https://www.youtube.com/watch?v=..."
                className="w-full rounded-xl border border-white/10 bg-[#0a0a1a] px-3.5 py-2.5 text-sm text-white placeholder-gray-500 focus:border-[#7FB706] focus:outline-none"
                autoFocus
              />
              <p className="text-[11px] text-gray-500 mt-1.5">
                Responsive 16:9 container conforming to modern web video standards.
              </p>
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t border-white/10">
              <button
                type="button"
                onClick={() => setShowVideoModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-400 hover:bg-white/5 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleApplyVideo}
                disabled={!videoUrl.trim()}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-[#7FB706] text-white hover:bg-[#6fa005] disabled:opacity-40"
              >
                Embed Video
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Table Modal ────────────────────────────────────────────────────── */}
      {showTableModal && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#121226] p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-white">Insert Structured Table</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1.5">Number of Rows</label>
                <input
                  type="number"
                  min={1}
                  max={20}
                  value={tableRows}
                  onChange={(e) => setTableRows(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full rounded-xl border border-white/10 bg-[#0a0a1a] px-3.5 py-2.5 text-sm text-white focus:border-[#7FB706] focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1.5">Number of Columns</label>
                <input
                  type="number"
                  min={1}
                  max={10}
                  value={tableCols}
                  onChange={(e) => setTableCols(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full rounded-xl border border-white/10 bg-[#0a0a1a] px-3.5 py-2.5 text-sm text-white focus:border-[#7FB706] focus:outline-none"
                />
              </div>
            </div>
            <p className="text-[11px] text-gray-500">
              Includes top header row. You can add or delete rows and columns anytime using the table ribbon.
            </p>
            <div className="flex justify-end gap-2 pt-2 border-t border-white/10">
              <button
                type="button"
                onClick={() => setShowTableModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-400 hover:bg-white/5 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleInsertTable}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-[#7FB706] text-white hover:bg-[#6fa005]"
              >
                Insert Table
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  if (viewMode === "ZEN" && typeof document !== "undefined") {
    return createPortal(editorDom, document.body);
  }

  return editorDom;
};
