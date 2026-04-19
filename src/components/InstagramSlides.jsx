import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Maximize2, Download, Plus, X, FileText, Linkedin, Send, Loader2, Copy, Check } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { jsPDF } from 'jspdf';

const DEFAULT_ESSAY = '';

export default function InstagramSlides() {
  const isWatermarkRoute = window.location.pathname === '/watermark';
  const [showWatermark, setShowWatermark] = useState(isWatermarkRoute);
  const [showPageNumbers, setShowPageNumbers] = useState(true);
  const [showMadeWith, setShowMadeWith] = useState(false);
  const [totalPagesOverride, setTotalPagesOverride] = useState(null);
  const [styles, setStyles] = useState({
    colors: {
      gradientStart: '#1A1A2E',
      gradientMiddle: '#1A1A2E',
      gradientEnd: '#1A1A2E',
      text: '#E8E8E8'
    },
    fontFamily: 'Courier New',
    fontSize: {
      title: 56,
      normal: 40,
      bullet: 32
    },
    slideSpecific: {}
  });

  const [essay, setEssay] = useState(DEFAULT_ESSAY);
  const [slides, setSlides] = useState([]);
  const [slideImages, setSlideImages] = useState([]);
  const [insertedImages, setInsertedImages] = useState({});
  const [preview, setPreview] = useState({ show: false, image: '' });
  const [linkedin, setLinkedin] = useState({ token: null, name: '', sub: '' });
  const [linkedinPost, setLinkedinPost] = useState('');
  const [linkedinStatus, setLinkedinStatus] = useState(''); // '', 'posting', 'success', 'error'
  const [showLinkedinSection, setShowLinkedinSection] = useState(false);
  const [generatedPrompt, setGeneratedPrompt] = useState('');
  const [promptCopied, setPromptCopied] = useState(false);
  const [showPlainText, setShowPlainText] = useState(false);
  const [plainTextCopied, setPlainTextCopied] = useState(false);
  const canvasRef = useRef(null);
  const fileInputRefs = useRef({});

  const hexToRgb = (hex) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgb(${r}, ${g}, ${b})`;
  };

  const rgbToHex = (rgbStr) => {
    const match = rgbStr.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
    if (!match) return null;
    const r = parseInt(match[1]).toString(16).padStart(2, '0');
    const g = parseInt(match[2]).toString(16).padStart(2, '0');
    const b = parseInt(match[3]).toString(16).padStart(2, '0');
    return `#${r}${g}${b}`;
  };

  const restoreSettings = (input) => {
    const fontMatch = input.match(/Font:\s*([^|]+?)(?:\s{2}|\s*Top:)/);
    const topMatch = input.match(/Top:\s*(rgb\(\d+,\s*\d+,\s*\d+\))/);
    const midMatch = input.match(/Mid:\s*(rgb\(\d+,\s*\d+,\s*\d+\))/);
    const botMatch = input.match(/Bot:\s*(rgb\(\d+,\s*\d+,\s*\d+\))/);
    const textMatch = input.match(/Text:\s*(rgb\(\d+,\s*\d+,\s*\d+\))/);

    if (topMatch && midMatch && botMatch && textMatch) {
      setStyles(prev => ({
        ...prev,
        fontFamily: fontMatch ? fontMatch[1].trim() : prev.fontFamily,
        colors: {
          gradientStart: rgbToHex(topMatch[1]),
          gradientMiddle: rgbToHex(midMatch[1]),
          gradientEnd: rgbToHex(botMatch[1]),
          text: rgbToHex(textMatch[1]),
        }
      }));
    }
  };

  // Pick up LinkedIn auth token from redirect
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const linkedinParam = params.get('linkedin');
    if (linkedinParam) {
      const linkedinData = new URLSearchParams(linkedinParam);
      setLinkedin({
        token: linkedinData.get('token'),
        name: linkedinData.get('name'),
        sub: linkedinData.get('sub'),
      });
      // Clean URL
      window.history.replaceState({}, '', '/');
    }
  }, []);

  const connectLinkedin = () => {
    window.location.href = '/api/linkedin/auth';
  };

  const postToLinkedin = async () => {
    if (!linkedin.token || !linkedinPost.trim()) return;

    setLinkedinStatus('posting');

    try {
      // Build PDF as base64
      const pages = buildPdfPageOrder();
      let pdfBase64 = null;

      if (pages.length > 0) {
        const pdf = new jsPDF({ orientation: 'portrait', unit: 'px', format: [1080, 1080] });
        for (let i = 0; i < pages.length; i++) {
          if (i > 0) pdf.addPage([1080, 1080]);
          pdf.addImage(pages[i], 'PNG', 0, 0, 1080, 1080);
        }
        pdfBase64 = pdf.output('datauristring').split(',')[1];
      }

      const res = await fetch('/api/linkedin/post', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: linkedin.token,
          authorUrn: linkedin.sub,
          text: linkedinPost,
          pdfBase64,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setLinkedinStatus('success');
      } else {
        setLinkedinStatus('error');
        console.error('LinkedIn post error:', data);
      }
    } catch (err) {
      setLinkedinStatus('error');
      console.error('LinkedIn post error:', err);
    }
  };

  const stripMarkdown = (text) => {
    return text
      .replace(/\*\*([^*]+)\*\*/g, '$1')  // **bold**
      .replace(/\*([^*]+)\*/g, '$1')       // *italic*
      .replace(/~([^~]+)~/g, '$1')         // ~strike~
      .replace(/\{[slx]\}/g, '')           // {s} {l} {x}
      .replace(/\^\^\^/g, '')              // ^^^
      .replace(/\/\/\//g, '\n\n')          // /// → paragraph break
      .replace(/\n{3,}/g, '\n\n')          // collapse extra newlines
      .trim();
  };

  const getPlainText = () => stripMarkdown(essay);

  const copyPlainText = () => {
    navigator.clipboard.writeText(getPlainText());
    setPlainTextCopied(true);
    setTimeout(() => setPlainTextCopied(false), 2000);
  };

  const generateLinkedinPrompt = () => {
    const slideText = slides.join('\n\n---\n\n');
    const prompt = `I'm posting a slide carousel on LinkedIn with the following content. Write me a LinkedIn post to accompany it.

Rules:
- 3-5 sentences, conversational, not corporate
- Don't start with "I" — LinkedIn buries those posts
- End with a question or invitation to engage
- Match the tone of the writing — direct, warm, a little irreverent
- No hashtags unless they feel natural
- This is a personal essay/story, not thought leadership

Here's the slide content:

${slideText}`;

    setGeneratedPrompt(prompt);
    setPromptCopied(false);
  };

  const copyPrompt = () => {
    navigator.clipboard.writeText(generatedPrompt);
    setPromptCopied(true);
    setTimeout(() => setPromptCopied(false), 2000);
  };

  const fonts = [
    'Arial',
    'Bitter',
    'Cormorant Garamond',
    'Courier New',
    'Crimson Text',
    'DM Sans',
    'EB Garamond',
    'Georgia',
    'Helvetica',
    'IBM Plex Mono',
    'Inter',
    'JetBrains Mono',
    'Lato',
    'Libre Baskerville',
    'Literata',
    'Lora',
    'Merriweather',
    'Montserrat',
    'Open Sans',
    'Palatino',
    'Playfair Display',
    'Raleway',
    'Source Serif 4',
    'Space Mono',
    'Spectral',
    'Times New Roman',
    'Verdana',
  ];

  const generateSlides = () => {
    setSlides(essay.split('///').map(slide => slide.trim()).filter(slide => slide.length > 0));
  };

  const parseTextSegments = (text) => {
    const segments = [];
    let currentText = '';
    let currentStyle = 'normal';
    let currentSize = 'normal';
    let i = 0;

    const addSegment = () => {
      if (currentText) {
        segments.push({
          text: currentText,
          style: currentStyle,
          size: currentSize
        });
        currentText = '';
      }
    };

    while (i < text.length) {
      if (text[i] === '~') {
        addSegment();
        currentStyle = currentStyle === 'strike' ? 'normal' : 'strike';
        i += 1;
      }
      else if (i + 2 < text.length && text[i] === '{' &&
          (text[i+1] === 's' || text[i+1] === 'l' || text[i+1] === 'x') &&
          text[i+2] === '}') {
        addSegment();
        if (text[i+1] === 's') currentSize = 'small';
        else if (text[i+1] === 'l') currentSize = 'large';
        else currentSize = 'xlarge';
        i += 3;
      }
      else if (i + 1 < text.length && text[i] === '*' && text[i+1] === '*') {
        addSegment();
        currentStyle = currentStyle === 'bold' ? 'normal' : 'bold';
        i += 2;
      }
      else if (text[i] === '*') {
        addSegment();
        currentStyle = currentStyle === 'italic' ? 'normal' : 'italic';
        i += 1;
      }
      else {
        currentText += text[i];
        i += 1;
      }
    }

    addSegment();

    return segments;
  };

  const processText = (text) => {
    const segments = parseTextSegments(text);
    return segments.map((segment, i) => {
      let style = {};

      if (segment.size === 'small') {
        style.fontSize = '0.7em';
      } else if (segment.size === 'large') {
        style.fontSize = '1.3em';
      } else if (segment.size === 'xlarge') {
        style.fontSize = '1.7em';
      }

      if (segment.style === 'bold') {
        return <strong key={i} style={style}>{segment.text}</strong>;
      } else if (segment.style === 'italic') {
        return <em key={i} style={style}>{segment.text}</em>;
      } else if (segment.style === 'strike') {
        return <span key={i} style={{...style, textDecoration: 'line-through'}}>{segment.text}</span>;
      } else {
        return <span key={i} style={style}>{segment.text}</span>;
      }
    });
  };

  const renderToCanvas = async (text, index, contentSlideCount) => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const scale = styles.slideSpecific[index]?.scale || 1;

    ctx.clearRect(0, 0, 1080, 1080);
    const gradient = ctx.createLinearGradient(0, 0, 1080, 1080);
    gradient.addColorStop(0, styles.colors.gradientStart);
    gradient.addColorStop(0.5, styles.colors.gradientMiddle);
    gradient.addColorStop(1, styles.colors.gradientEnd);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 1080, 1080);

    const renderLine = (line, x, y, fontSize) => {
      const scaledSize = fontSize * parseFloat(scale);
      ctx.fillStyle = styles.colors.text;
      const maxWidth = 920;
      let currentY = y;

      const segments = parseTextSegments(line);
      let currentX = x;
      let lines = [];

      segments.forEach(segment => {
        const words = segment.text.split(' ');
        words.forEach((word, i) => {
          const wordWithSpace = i < words.length - 1 ? word + ' ' : word;
          lines.push({
            text: wordWithSpace,
            style: segment.style,
            size: segment.size
          });
        });
      });

      let lineContent = [];
      let lineWidth = 0;

      const renderCurrentLine = () => {
        if (lineContent.length === 0) return;

        currentX = x;
        lineContent.forEach(item => {
          let adjustedSize = scaledSize;
          if (item.size === 'small') adjustedSize = scaledSize * 0.7;
          if (item.size === 'large') adjustedSize = scaledSize * 1.3;
          if (item.size === 'xlarge') adjustedSize = scaledSize * 1.7;

          const fontStyle = item.style === 'normal' || item.style === 'strike' ? '' : item.style;
          ctx.font = `${fontStyle} ${adjustedSize}px ${styles.fontFamily}`;

          ctx.fillText(item.text, currentX, currentY);

          if (item.style === 'strike') {
            const metrics = ctx.measureText(item.text);
            const textWidth = metrics.width;
            const strikeY = currentY - adjustedSize * 0.3;
            ctx.lineWidth = Math.max(1, adjustedSize * 0.05);
            ctx.beginPath();
            ctx.moveTo(currentX, strikeY);
            ctx.lineTo(currentX + textWidth, strikeY);
            ctx.stroke();
          }

          currentX += ctx.measureText(item.text).width;
        });

        const largestSizeInLine = Math.max(...lineContent.map(item => {
          if (item.size === 'small') return scaledSize * 0.7;
          if (item.size === 'large') return scaledSize * 1.3;
          if (item.size === 'xlarge') return scaledSize * 1.7;
          return scaledSize;
        }));

        const lineSpacingFactor = largestSizeInLine > scaledSize * 1.5 ? 1.6 :
                                 largestSizeInLine > scaledSize * 1.2 ? 1.5 :
                                 1.4;

        currentY += largestSizeInLine * lineSpacingFactor;
        lineContent = [];
        lineWidth = 0;
      };

      lines.forEach(item => {
        let adjustedSize = scaledSize;
        if (item.size === 'small') adjustedSize = scaledSize * 0.7;
        if (item.size === 'large') adjustedSize = scaledSize * 1.3;
        if (item.size === 'xlarge') adjustedSize = scaledSize * 1.7;

        const fontStyle = item.style === 'normal' || item.style === 'strike' ? '' : item.style;
        ctx.font = `${fontStyle} ${adjustedSize}px ${styles.fontFamily}`;
        const wordWidth = ctx.measureText(item.text).width;

        if (lineWidth + wordWidth > maxWidth) {
          renderCurrentLine();
        }

        lineContent.push(item);
        lineWidth += wordWidth;
      });

      renderCurrentLine();

      return currentY - y;
    };

    let currentY = 200;
    const lines = text.split('\n');

    for (let i = 0; i < lines.length; i++) {
      if (!lines[i].trim()) continue;
      if (lines[i].trim() === '^^^') {
        currentY += 30;
        continue;
      }

      let fontSize, xPos;
      const trimmedLine = lines[i].trim();

      if (i === 0 && index === 0) {
        fontSize = styles.fontSize.normal;
        xPos = 80;
      } else if (trimmedLine.startsWith('-')) {
        fontSize = styles.fontSize.bullet;
        xPos = 110;
        ctx.fillText('•', 80, currentY);
      } else {
        fontSize = styles.fontSize.normal;
        xPos = 80;
      }

      const lineText = trimmedLine.startsWith('-') ? trimmedLine.slice(1).trim() : trimmedLine;
      const lineHeight = renderLine(lineText, xPos, currentY, fontSize);
      currentY += lineHeight;

      const nextLine = lines[i + 1];
      if (nextLine === undefined) {
      } else if (nextLine.trim() === '') {
        currentY += 40;
      } else if (trimmedLine.startsWith('-')) {
        currentY += 10;
      }
    }

    if (showPageNumbers) {
      ctx.textAlign = 'center';
      ctx.font = `${18 * scale}px ${styles.fontFamily}`;
      ctx.fillStyle = styles.colors.text;
      ctx.globalAlpha = 0.7;
      const totalPages = totalPagesOverride !== null ? totalPagesOverride : contentSlideCount;
      ctx.fillText(`${index + 1} / ${totalPages}`, 540, 1040);
      ctx.globalAlpha = 1.0;
      ctx.textAlign = 'left';
    }

    if (showWatermark) {
      ctx.textAlign = 'left';
      ctx.globalAlpha = 0.35;

      ctx.font = `bold ${28 * scale}px Arial`;
      ctx.fillText('EGGY', 50, 990);

      ctx.font = `${20 * scale}px ${styles.fontFamily}`;
      ctx.fillText("Doctor Clot's Diary", 50, 1020);

      ctx.textAlign = 'left';
      ctx.globalAlpha = 1.0;
    }

    if (showMadeWith) {
      ctx.textAlign = 'center';
      ctx.globalAlpha = 0.4;
      ctx.font = `${16 * scale}px ${styles.fontFamily}`;
      const madeWithY = showPageNumbers ? 1065 : 1050;
      ctx.fillText('made with love at mystoryshelf.com', 540, madeWithY);
      ctx.globalAlpha = 1.0;
      ctx.textAlign = 'left';
    }

    return canvas.toDataURL('image/png');
  };

  const renderBlankSlide = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, 1080, 1080);
    const gradient = ctx.createLinearGradient(0, 0, 1080, 1080);
    gradient.addColorStop(0, styles.colors.gradientStart);
    gradient.addColorStop(0.5, styles.colors.gradientMiddle);
    gradient.addColorStop(1, styles.colors.gradientEnd);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 1080, 1080);
    return canvas.toDataURL('image/png');
  };

  const renderAllSlides = useCallback(async () => {
    if (slides.length === 0) {
      setSlideImages([]);
      return;
    }
    const contentCount = slides.length;
    const images = [];
    for (let i = 0; i < slides.length; i++) {
      const img = await renderToCanvas(slides[i], i, contentCount);
      images.push(img);
    }
    images.push(renderBlankSlide());
    setSlideImages(images);
  }, [slides, styles, showWatermark, showPageNumbers, showMadeWith, totalPagesOverride]);

  useEffect(() => {
    renderAllSlides();
  }, [renderAllSlides]);

  const downloadSlide = (dataUrl, index) => {
    const link = document.createElement('a');
    link.download = `slide-${String(index + 1).padStart(2, '0')}.png`;
    link.href = dataUrl;
    link.click();
  };

  const downloadAll = () => {
    slideImages.forEach((img, i) => {
      setTimeout(() => downloadSlide(img, i), i * 200);
    });
  };

  const handleImageInsert = (position, file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      setInsertedImages(prev => ({
        ...prev,
        [position]: [...(prev[position] || []), e.target.result]
      }));
    };
    reader.readAsDataURL(file);
  };

  const removeInsertedImage = (position, imageIndex) => {
    setInsertedImages(prev => {
      const updated = { ...prev };
      updated[position] = updated[position].filter((_, i) => i !== imageIndex);
      if (updated[position].length === 0) delete updated[position];
      return updated;
    });
  };

  const buildPdfPageOrder = () => {
    const pages = [];
    for (let i = 0; i < slides.length; i++) {
      // Images inserted before this slide (position = index)
      if (insertedImages[i]) {
        insertedImages[i].forEach(img => pages.push(img));
      }
      // The slide itself
      if (slideImages[i]) pages.push(slideImages[i]);
    }
    // Images after the last slide (position = slides.length)
    if (insertedImages[slides.length]) {
      insertedImages[slides.length].forEach(img => pages.push(img));
    }
    return pages;
  };

  const createPdf = async () => {
    const pages = buildPdfPageOrder();
    if (pages.length === 0) return;

    const pdf = new jsPDF({ orientation: 'portrait', unit: 'px', format: [1080, 1080] });

    for (let i = 0; i < pages.length; i++) {
      if (i > 0) pdf.addPage([1080, 1080]);
      pdf.addImage(pages[i], 'PNG', 0, 0, 1080, 1080);
    }

    pdf.save('slides.pdf');
  };

  return (
    <div className="p-6 max-w-screen-xl mx-auto">
      <canvas ref={canvasRef} width={1080} height={1080} className="hidden" />

      {/* Explainer */}
      <div className="mb-8 pt-4 text-center">
        <h1 className="text-3xl font-semibold tracking-tight mb-2" style={{color: '#1a1916'}}>StoryShelf Slides</h1>
        <p className="text-sm max-w-lg mx-auto" style={{color: '#8a8880'}}>Turn your writing into beautiful carousel slides for Instagram and LinkedIn. Paste your text, style it, and export — no design tools needed.</p>
      </div>

      {/* Style Controls */}
      <div className="mb-8 p-5 border border-gray-200 rounded-xl bg-white shadow-sm">
        <div className="grid grid-cols-1 gap-4">
          <div>
            <label className="block text-sm mb-1">Font</label>
            <select
              value={styles.fontFamily}
              onChange={e => setStyles({...styles, fontFamily: e.target.value})}
              className="w-full p-2 border rounded"
            >
              {fonts.map(font => (
                <option key={font} value={font}>{font}</option>
              ))}
            </select>
          </div>

          {isWatermarkRoute && (
          <div className="flex justify-between items-center">
            <label className="text-sm">Watermark</label>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowWatermark(prev => !prev)}
              className="w-32"
            >
              {showWatermark ? 'Hide' : 'Show'}
            </Button>
          </div>
          )}

          <div className="flex justify-between items-center">
            <label className="text-sm">Page Numbers</label>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowPageNumbers(prev => !prev)}
                className="w-32"
              >
                {showPageNumbers ? 'Hide' : 'Show'}
              </Button>
              {showPageNumbers && (
                <div className="flex items-center space-x-2">
                  <span className="text-xs">Total:</span>
                  <input
                    type="number"
                    value={totalPagesOverride === null ? '' : totalPagesOverride}
                    onChange={e => {
                      const value = e.target.value === '' ? null : parseInt(e.target.value, 10);
                      setTotalPagesOverride(value >= 1 ? value : null);
                    }}
                    placeholder={slides.length}
                    className="w-16 h-8 px-2 border rounded"
                  />
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-between items-center">
            <label className="text-sm">Made with love footer</label>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowMadeWith(prev => !prev)}
              className="w-32"
            >
              {showMadeWith ? 'Hide' : 'Show'}
            </Button>
          </div>

          <div>
            <label className="block text-sm mb-1">Colors</label>
            <div className="grid grid-cols-4 gap-2">
              <div>
                <label className="block text-xs mb-1">Top Color</label>
                <Input
                  type="color"
                  value={styles.colors.gradientStart}
                  onChange={e => setStyles({
                    ...styles,
                    colors: { ...styles.colors, gradientStart: e.target.value }
                  })}
                  className="h-10"
                />
              </div>
              <div>
                <label className="block text-xs mb-1">Middle Color</label>
                <Input
                  type="color"
                  value={styles.colors.gradientMiddle}
                  onChange={e => setStyles({
                    ...styles,
                    colors: { ...styles.colors, gradientMiddle: e.target.value }
                  })}
                  className="h-10"
                />
              </div>
              <div>
                <label className="block text-xs mb-1">Bottom Color</label>
                <Input
                  type="color"
                  value={styles.colors.gradientEnd}
                  onChange={e => setStyles({
                    ...styles,
                    colors: { ...styles.colors, gradientEnd: e.target.value }
                  })}
                  className="h-10"
                />
              </div>
              <div>
                <label className="block text-xs mb-1">Text Color</label>
                <Input
                  type="color"
                  value={styles.colors.text}
                  onChange={e => setStyles({
                    ...styles,
                    colors: { ...styles.colors, text: e.target.value }
                  })}
                  className="h-10"
                />
              </div>
            </div>
            <div className="mt-2">
              <div
                className="flex items-center gap-2 px-3 py-2 bg-gray-100 rounded text-xs font-mono cursor-pointer hover:bg-gray-200 transition-colors"
                onClick={() => {
                  const text = `Font: ${styles.fontFamily}  Top: ${hexToRgb(styles.colors.gradientStart)}  Mid: ${hexToRgb(styles.colors.gradientMiddle)}  Bot: ${hexToRgb(styles.colors.gradientEnd)}  Text: ${hexToRgb(styles.colors.text)}`;
                  navigator.clipboard.writeText(text);
                }}
                title="Click to copy"
              >
                <span>{styles.fontFamily}</span>
                <span className="text-gray-300">|</span>
                <span className="inline-block w-3 h-3 rounded-sm border" style={{ backgroundColor: styles.colors.gradientStart }}></span>
                {hexToRgb(styles.colors.gradientStart)}
                <span className="inline-block w-3 h-3 rounded-sm border" style={{ backgroundColor: styles.colors.gradientMiddle }}></span>
                {hexToRgb(styles.colors.gradientMiddle)}
                <span className="inline-block w-3 h-3 rounded-sm border" style={{ backgroundColor: styles.colors.gradientEnd }}></span>
                {hexToRgb(styles.colors.gradientEnd)}
                <span className="inline-block w-3 h-3 rounded-sm border" style={{ backgroundColor: styles.colors.text }}></span>
                {hexToRgb(styles.colors.text)}
                <span className="text-gray-400 ml-auto">click to copy</span>
              </div>
              <input
                type="text"
                placeholder="Paste saved settings here to restore"
                className="w-full mt-1 px-3 py-1.5 bg-white border rounded text-xs font-mono"
                onPaste={e => {
                  setTimeout(() => {
                    restoreSettings(e.target.value);
                    e.target.value = '';
                  }, 0);
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Text Input */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Button
            variant={showPlainText ? 'outline' : 'default'}
            size="sm"
            onClick={() => setShowPlainText(false)}
          >
            Markdown
          </Button>
          <Button
            variant={showPlainText ? 'default' : 'outline'}
            size="sm"
            onClick={() => setShowPlainText(true)}
          >
            Plain Text
          </Button>
          {showPlainText && (
            <Button
              variant="outline"
              size="sm"
              onClick={copyPlainText}
            >
              {plainTextCopied ? (
                <><Check className="w-3 h-3 mr-1" />Copied</>
              ) : (
                <><Copy className="w-3 h-3 mr-1" />Copy Plain Text</>
              )}
            </Button>
          )}
        </div>
        {showPlainText ? (
          <pre className="w-full h-64 mb-4 p-3 border rounded-md bg-gray-50 overflow-auto whitespace-pre-wrap text-sm">{getPlainText()}</pre>
        ) : (
          <Textarea
            value={essay}
            onChange={e => setEssay(e.target.value)}
            className="w-full h-64 mb-4"
            placeholder="Paste your essay here. Use /// to separate slides. Use - for bullets. Font formatting: *italic*, **bold**, ~strikethrough~, {s} small, {l} large, {x} extra large. Add ^^^ line for extra spacing."
          />
        )}
        <Button onClick={generateSlides}>
          Generate Slides
        </Button>
        <div className="mt-4 p-4 border rounded-lg bg-gray-50 text-sm text-gray-600">
          <p className="font-semibold text-gray-700 mb-2">Formatting Reference</p>
          <div className="grid grid-cols-2 gap-x-8 gap-y-1">
            <div><code className="bg-gray-200 px-1 rounded">///</code> — slide break</div>
            <div><code className="bg-gray-200 px-1 rounded">*text*</code> — <em>italic</em></div>
            <div><code className="bg-gray-200 px-1 rounded">**text**</code> — <strong>bold</strong></div>
            <div><code className="bg-gray-200 px-1 rounded">~text~</code> — <span style={{textDecoration: 'line-through'}}>strikethrough</span></div>
            <div><code className="bg-gray-200 px-1 rounded">- text</code> — bullet point</div>
            <div><code className="bg-gray-200 px-1 rounded">^^^</code> — extra vertical spacing</div>
            <div><code className="bg-gray-200 px-1 rounded">{'{s}'}</code> — small text (70%)</div>
            <div><code className="bg-gray-200 px-1 rounded">{'{l}'}</code> — large text (130%)</div>
            <div><code className="bg-gray-200 px-1 rounded">{'{x}'}</code> — extra large text (170%)</div>
            <div>blank line — paragraph break</div>
          </div>
        </div>
      </div>

      {/* Download All & PDF */}
      {slideImages.length > 0 && (
        <div className="mb-6 text-center space-x-4">
          <Button onClick={downloadAll} className="text-base px-6 py-3">
            <Download className="w-5 h-5 mr-2" />
            Download All {slides.length} Slides + Blank
          </Button>
          <Button onClick={createPdf} className="text-base px-6 py-3">
            <FileText className="w-5 h-5 mr-2" />
            Create PDF {Object.keys(insertedImages).length > 0 ? '(with photos)' : ''}
          </Button>
        </div>
      )}

      {/* Slides Preview */}
      <div className="grid grid-cols-1 gap-4">
        {slides.map((slide, index) => (
          <React.Fragment key={`slide-group-${index}`}>
            {/* Insert image zone before this slide */}
            <div className="flex flex-col items-center gap-2">
              {(insertedImages[index] || []).map((img, imgIdx) => (
                <div key={`inserted-${index}-${imgIdx}`} className="relative mx-auto" style={{ maxWidth: '600px' }}>
                  <img src={img} alt={`Inserted before slide ${index + 1}`} className="w-full h-auto rounded-lg border-2 border-dashed border-blue-300" />
                  <button
                    onClick={() => removeInsertedImage(index, imgIdx)}
                    className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                  <p className="text-xs text-blue-500 text-center mt-1">Inserted photo (PDF only)</p>
                </div>
              ))}
              <div>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  ref={el => fileInputRefs.current[`before-${index}`] = el}
                  onChange={e => {
                    handleImageInsert(index, e.target.files[0]);
                    e.target.value = '';
                  }}
                />
                <button
                  onClick={() => fileInputRefs.current[`before-${index}`]?.click()}
                  className="flex items-center gap-1 text-xs text-gray-400 hover:text-blue-500 border border-dashed border-gray-300 hover:border-blue-400 rounded-full px-3 py-1 transition-colors"
                >
                  <Plus className="w-3 h-3" /> Insert photo here
                </button>
              </div>
            </div>

            {/* The slide */}
            <div className="relative">
              <div className="mb-4">
                <select
                  value={styles.slideSpecific[index]?.scale || '1'}
                  onChange={e => {
                    const newSlideSpecific = { ...styles.slideSpecific };
                    newSlideSpecific[index] = { scale: e.target.value };
                    setStyles({ ...styles, slideSpecific: newSlideSpecific });
                  }}
                  className="w-full p-2 border rounded"
                >
                  <option value="0.8">Small (80%)</option>
                  <option value="0.9">Medium (90%)</option>
                  <option value="1">Default (100%)</option>
                  <option value="1.1">Large (110%)</option>
                </select>
              </div>

              <div className="relative mx-auto" style={{ maxWidth: '600px' }}>
                {slideImages[index] ? (
                  <img
                    src={slideImages[index]}
                    alt={`Slide ${index + 1}`}
                    className="w-full h-auto rounded-lg"
                  />
                ) : (
                  <div className="w-full aspect-square bg-gray-200 rounded-lg flex items-center justify-center">
                    Rendering...
                  </div>
                )}
              </div>

              <div className="mt-4 text-center space-x-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    if (slideImages[index]) {
                      setPreview({ show: true, image: slideImages[index] });
                    }
                  }}
                >
                  <Maximize2 className="w-4 h-4 mr-2" />
                  Full Size
                </Button>
                <Button
                  onClick={() => {
                    if (slideImages[index]) {
                      downloadSlide(slideImages[index], index);
                    }
                  }}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download Slide {index + 1}
                </Button>
              </div>
            </div>
          </React.Fragment>
        ))}

        {/* Insert image zone after last slide */}
        {slides.length > 0 && (
          <div className="flex flex-col items-center gap-2">
            {(insertedImages[slides.length] || []).map((img, imgIdx) => (
              <div key={`inserted-end-${imgIdx}`} className="relative mx-auto" style={{ maxWidth: '600px' }}>
                <img src={img} alt="Inserted after last slide" className="w-full h-auto rounded-lg border-2 border-dashed border-blue-300" />
                <button
                  onClick={() => removeInsertedImage(slides.length, imgIdx)}
                  className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                >
                  <X className="w-4 h-4" />
                </button>
                <p className="text-xs text-blue-500 text-center mt-1">Inserted photo (PDF only)</p>
              </div>
            ))}
            <div>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                ref={el => fileInputRefs.current[`after-last`] = el}
                onChange={e => {
                  handleImageInsert(slides.length, e.target.files[0]);
                  e.target.value = '';
                }}
              />
              <button
                onClick={() => fileInputRefs.current[`after-last`]?.click()}
                className="flex items-center gap-1 text-xs text-gray-400 hover:text-blue-500 border border-dashed border-gray-300 hover:border-blue-400 rounded-full px-3 py-1 transition-colors"
              >
                <Plus className="w-3 h-3" /> Insert photo here
              </button>
            </div>
          </div>
        )}

        {/* Blank Background Slide */}
        {slideImages.length > slides.length && (
          <div className="relative">
            <div className="relative mx-auto" style={{ maxWidth: '600px' }}>
              <img
                src={slideImages[slides.length]}
                alt="Blank background"
                className="w-full h-auto rounded-lg"
              />
            </div>
            <div className="mt-4 text-center space-x-3">
              <p className="text-sm text-gray-500 mb-2">Blank Background</p>
              <Button
                onClick={() => {
                  const link = document.createElement('a');
                  link.download = 'slide-blank.png';
                  link.href = slideImages[slides.length];
                  link.click();
                }}
              >
                <Download className="w-4 h-4 mr-2" />
                Download Blank
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* LinkedIn Section */}
      {slides.length > 0 && (
        <div className="mt-8 p-5 border border-gray-200 rounded-xl bg-white shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Linkedin className="w-5 h-5 text-blue-600" />
              LinkedIn Draft
            </h3>
            {!linkedin.token ? (
              <Button onClick={connectLinkedin} className="bg-blue-600 hover:bg-blue-700">
                <Linkedin className="w-4 h-4 mr-2" />
                Connect LinkedIn
              </Button>
            ) : (
              <span className="text-sm text-green-600">Connected as {linkedin.name}</span>
            )}
          </div>
          <p className="text-sm mb-4" style={{color: '#8a8880'}}>Write your post copy, then save as a draft to LinkedIn with your PDF attached. You'll review and publish from LinkedIn.</p>

          <Textarea
            value={linkedinPost}
            onChange={e => setLinkedinPost(e.target.value)}
            className="w-full h-32 mb-4"
            placeholder="Write or paste your LinkedIn post copy here..."
          />
          <div className="flex gap-3">
            {linkedin.token ? (
              <Button
                onClick={postToLinkedin}
                disabled={!linkedinPost.trim() || linkedinStatus === 'posting'}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {linkedinStatus === 'posting' ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving...</>
                ) : (
                  <><Send className="w-4 h-4 mr-2" />Save draft to LinkedIn</>
                )}
              </Button>
            ) : (
              <Button
                onClick={() => {
                  navigator.clipboard.writeText(linkedinPost);
                  setLinkedinStatus('copied');
                  setTimeout(() => setLinkedinStatus(''), 2000);
                }}
                disabled={!linkedinPost.trim()}
                variant="outline"
              >
                {linkedinStatus === 'copied' ? (
                  <><Check className="w-4 h-4 mr-2" />Copied!</>
                ) : (
                  <><Copy className="w-4 h-4 mr-2" />Copy text</>
                )}
              </Button>
            )}
          </div>
          {linkedinStatus === 'success' && (
            <p className="mt-3 text-sm text-green-600">Draft saved! Open LinkedIn to review and publish.</p>
          )}
          {linkedinStatus === 'error' && (
            <p className="mt-3 text-sm text-red-600">Failed to save draft. Try reconnecting LinkedIn.</p>
          )}
        </div>
      )}

      {/* Instagram Section */}
      {slideImages.length > 0 && (
        <div className="mt-4 p-5 border border-gray-200 rounded-xl bg-white shadow-sm">
          <h3 className="text-lg font-semibold flex items-center gap-2 mb-2">
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="#E1306C" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5"/><circle cx="12" cy="12" r="5"/><circle cx="17.5" cy="6.5" r="1.5" fill="#E1306C" stroke="none"/></svg>
            Post to Instagram
          </h3>
          <p className="text-sm mb-4" style={{color: '#8a8880'}}>Download your slides, then open Instagram to create a carousel post.</p>
          <div className="flex gap-3">
            <Button onClick={downloadAll} variant="outline">
              <Download className="w-4 h-4 mr-2" />
              Download all slides
            </Button>
            <Button
              onClick={() => window.open('https://www.instagram.com', '_blank')}
              style={{background: '#E1306C', color: 'white'}}
              className="hover:opacity-90"
            >
              Open Instagram
            </Button>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      <Dialog open={preview.show} onOpenChange={show => setPreview({ ...preview, show })}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Preview Image</DialogTitle>
            <DialogDescription>
              Right-click the image and select "Save Image As..." to download
            </DialogDescription>
          </DialogHeader>
          {preview.image && (
            <div className="mt-4">
              <img
                src={preview.image}
                alt="Slide preview"
                className="w-full h-auto"
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
