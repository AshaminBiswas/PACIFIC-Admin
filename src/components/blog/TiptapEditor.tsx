import React, { useState, useRef, useCallback } from "react";
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
} from "lucide-react";

interface TiptapEditorProps {
  content: string;
  onChange: (html: string) => void;
  placeholder?: string;
  className?: string;
}

export const TiptapEditor: React.FC<TiptapEditorProps> = ({
  content,
  onChange,
  placeholder = "Write your article content here...",
  className = "",
}) => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const [linkText, setLinkText] = useState("");
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

  const fileInputRef = useRef<HTMLInputElement>(null);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [2, 3, 4],
        },
      }),
      Underline,
      Highlight.configure({ multicolor: true }),
      TextAlign.configure({
        types: ["heading", "paragraph"],
      }),
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
          "prose prose-invert max-w-none min-h-[420px] focus:outline-none p-6 text-gray-200 leading-relaxed text-base selection:bg-[#7FB706]/30",
      },
    },
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
  });

  // Link Handling
  const handleOpenLinkModal = () => {
    if (!editor) return;
    const previousUrl = editor.getAttributes("link").href || "";
    setLinkUrl(previousUrl);
    const selectedText = editor.state.doc.textBetween(
      editor.state.selection.from,
      editor.state.selection.to,
      " "
    );
    setLinkText(selectedText);
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
    setLinkText("");
  };

  // Image Handling
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
    } catch (err) {
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

  // Video Handling
  const handleApplyVideo = () => {
    if (!editor || !videoUrl.trim()) return;
    const url = videoUrl.trim();

    // Check if YouTube
    if (url.includes("youtube.com") || url.includes("youtu.be")) {
      editor.chain().focus().setYoutubeVideo({ src: url }).run();
    } else if (url.includes("vimeo.com")) {
      // Vimeo embed fallback
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

  // Table Handling
  const handleInsertTable = () => {
    if (!editor) return;
    editor
      .chain()
      .focus()
      .insertTable({ rows: Number(tableRows), cols: Number(tableCols), withHeaderRow: true })
      .run();
    setShowTableModal(false);
  };

  // Content Blocks
  const insertCallout = (type: "info" | "warning" | "cta") => {
    if (!editor) return;
    const styles = {
      info: "border-l-4 border-emerald-500 bg-emerald-500/10 text-emerald-200 p-4 rounded-r-xl my-6",
      warning: "border-l-4 border-amber-500 bg-amber-500/10 text-amber-200 p-4 rounded-r-xl my-6",
      cta: "border border-[#7FB706]/40 bg-[#7FB706]/10 p-6 rounded-2xl my-8 text-center",
    };

    let template = "";
    if (type === "info") {
      template = `<div class="${styles.info}"><strong>Pro Tip:</strong> Compact laminate panels are engineered for high-traffic environments, with zero water absorption and antibacterial surfaces.</div>`;
    } else if (type === "warning") {
      template = `<div class="${styles.warning}"><strong>Important Notice:</strong> Ensure floor-to-wall clearance alignments conform to IS:2046 architectural guidelines before final bracket anchoring.</div>`;
    } else if (type === "cta") {
      template = `<div class="${styles.cta}"><h4 class="text-xl font-bold text-white mb-2">Need a Turnkey Restroom Cubicle BOQ Quote?</h4><p class="text-sm text-gray-300 mb-4">Connect directly with Pacific engineering specialists for direct factory supply across India & GCC.</p><a href="/contact" class="inline-block px-6 py-2.5 bg-[#7FB706] text-white font-bold rounded-xl text-sm shadow-lg hover:bg-[#6fa005]">Request a Project Quote &rarr;</a></div>`;
    }

    editor.chain().focus().insertContent(template).run();
  };

  if (!editor) {
    return (
      <div className="h-96 rounded-2xl bg-[#0a0a1a] border border-white/10 flex items-center justify-center text-gray-400">
        Loading Word Processor...
      </div>
    );
  }

  return (
    <div
      className={`relative rounded-2xl border border-white/10 bg-[#0a0a1a] transition-all flex flex-col ${
        isFullscreen ? "fixed inset-0 z-50 rounded-none border-none h-screen w-screen" : "min-h-[520px]"
      } ${className}`}
    >
      {/* ── Toolbar ────────────────────────────────────────────────────────── */}
      <div className="sticky top-0 z-20 flex flex-wrap items-center gap-1 border-b border-white/10 bg-[#121226]/95 p-2 backdrop-blur-md">
        {/* Undo / Redo */}
        <div className="flex items-center border-r border-white/10 pr-1.5 mr-1">
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
        </div>

        {/* Headings */}
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

        {/* Typography Formatting */}
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
            onClick={() => editor.chain().focus().toggleHighlight({ color: "#7FB70633" }).run()}
            className={`p-1.5 rounded-lg ${
              editor.isActive("highlight")
                ? "bg-[#7FB706]/20 text-[#B5F823]"
                : "text-gray-400 hover:bg-white/10 hover:text-white"
            }`}
            title="Highlight Text"
          >
            <Highlighter className="w-4 h-4" />
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
            title="Bullet List"
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
            title="Numbered List"
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
            title="Insert Link"
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
            title="Insert Image"
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
            title="Insert Table"
          >
            <TableIcon className="w-4 h-4" />
          </button>
        </div>

        {/* Content Block Presets */}
        <div className="flex items-center gap-1 border-r border-white/10 pr-1.5 mr-1">
          <button
            type="button"
            onClick={() => insertCallout("info")}
            className="px-2 py-1 rounded-lg text-xs font-semibold bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 flex items-center gap-1"
            title="Insert Tip/Info Callout"
          >
            <Info className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Tip</span>
          </button>
          <button
            type="button"
            onClick={() => insertCallout("warning")}
            className="px-2 py-1 rounded-lg text-xs font-semibold bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 flex items-center gap-1"
            title="Insert Warning Callout"
          >
            <AlertCircle className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Warning</span>
          </button>
          <button
            type="button"
            onClick={() => insertCallout("cta")}
            className="px-2 py-1 rounded-lg text-xs font-semibold bg-[#7FB706]/15 text-[#B5F823] hover:bg-[#7FB706]/25 flex items-center gap-1"
            title="Insert CTA Banner"
          >
            <CheckCircle className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">CTA Box</span>
          </button>
        </div>

        {/* Table Controls (Contextual when inside a table) */}
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

        {/* Fullscreen Toggle */}
        <div className="ml-auto">
          <button
            type="button"
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-1.5 rounded-lg text-gray-400 hover:bg-white/10 hover:text-white"
            title={isFullscreen ? "Exit Fullscreen" : "Fullscreen Writing Mode"}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* ── Editor Canvas ──────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto">
        <EditorContent editor={editor} />
      </div>

      {/* ── Link Modal ─────────────────────────────────────────────────────── */}
      {showLinkModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#121226] p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-4">Insert Hyperlink</h3>
            <div className="space-y-4">
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
                Open in new tab (target="_blank", rel="noopener noreferrer")
              </label>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowLinkModal(false)}
                  className="px-4 py-2 rounded-xl text-sm font-semibold text-gray-400 hover:bg-white/5 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleApplyLink}
                  className="px-5 py-2 rounded-xl text-sm font-bold bg-[#7FB706] text-white hover:bg-[#6fa005]"
                >
                  Apply Link
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Image Modal ────────────────────────────────────────────────────── */}
      {showImageModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#121226] p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-4">Insert Article Image</h3>
            <div className="space-y-4">
              {/* File Upload Option */}
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
                  <span>{isUploadingImage ? "Optimizing & Uploading..." : "Upload from Computer (WebP / PNG / JPG)"}</span>
                  <span className="text-[11px] text-gray-500">Auto-compressed & stored on ImageKit CDN</span>
                </label>
              </div>

              <div className="flex items-center gap-3">
                <div className="h-px flex-1 bg-white/10" />
                <span className="text-xs text-gray-500 uppercase">Or insert via URL</span>
                <div className="h-px flex-1 bg-white/10" />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1.5">Direct Image URL</label>
                <input
                  type="text"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="https://images.unsplash.com/..."
                  className="w-full rounded-xl border border-white/10 bg-[#0a0a1a] px-3.5 py-2.5 text-sm text-white placeholder-gray-500 focus:border-[#7FB706] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1.5">Alt Text (Crucial for SEO)</label>
                <input
                  type="text"
                  value={imageAlt}
                  onChange={(e) => setImageAlt(e.target.value)}
                  placeholder="e.g. Commercial restroom cubicle installation in office tower"
                  className="w-full rounded-xl border border-white/10 bg-[#0a0a1a] px-3.5 py-2.5 text-sm text-white placeholder-gray-500 focus:border-[#7FB706] focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowImageModal(false)}
                  className="px-4 py-2 rounded-xl text-sm font-semibold text-gray-400 hover:bg-white/5 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleApplyUrlImage}
                  disabled={!imageUrl.trim()}
                  className="px-5 py-2 rounded-xl text-sm font-bold bg-[#7FB706] text-white hover:bg-[#6fa005] disabled:opacity-40"
                >
                  Insert Image
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Video Modal ────────────────────────────────────────────────────── */}
      {showVideoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#121226] p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-4">Embed Video</h3>
            <div className="space-y-4">
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
                  Responsive 16:9 iframe embed container conforming to security standards.
                </p>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowVideoModal(false)}
                  className="px-4 py-2 rounded-xl text-sm font-semibold text-gray-400 hover:bg-white/5 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleApplyVideo}
                  disabled={!videoUrl.trim()}
                  className="px-5 py-2 rounded-xl text-sm font-bold bg-[#7FB706] text-white hover:bg-[#6fa005] disabled:opacity-40"
                >
                  Embed Video
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Table Modal ────────────────────────────────────────────────────── */}
      {showTableModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#121226] p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-4">Insert Structured Table</h3>
            <div className="space-y-4">
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
                Includes top header row. You can add or delete rows and columns anytime using the table toolbar.
              </p>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowTableModal(false)}
                  className="px-4 py-2 rounded-xl text-sm font-semibold text-gray-400 hover:bg-white/5 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleInsertTable}
                  className="px-5 py-2 rounded-xl text-sm font-bold bg-[#7FB706] text-white hover:bg-[#6fa005]"
                >
                  Insert Table
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
