import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Maximize2, Download, Plus, X, FileText, Linkedin, Send, Loader2, Copy, Check, ArrowUpRight, PenLine } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { jsPDF } from 'jspdf';

const DEFAULT_ESSAY = '';

// The example a curious writer sees first — one of Dave's own pieces, so the demo
// also doubles as a taste of his writing. Exercises ///, {l}/{s}/{x} sizing, and ^^^ spacing.
const SAMPLE_ESSAY = `{l}I bag groceries with geometric precision, like one might build a Tetris tower.
I’m not bragging or anything, but you should also know I’m excellent at using the self‑checkout scanner.
///
{l}While I recognize you struggle to straighten the crumpled barcode on the rotisserie chicken, I’ve got a secret technique I can’t tell you about.
By the way, if you search the onion category, choose Vidalia, and override to enter by weight, there’s a Konami code that will spit out skee‑ball tickets and a free banana.
///
{l}Do I double‑bag? Of course I double‑bag. In double time. All while you’re still cramming that second bag into the first, tearing holes like a monkey pulling the lid off a tin of nicotine pouches.
^^^
^^^
^^^
{s}Footnote: why in tarnation would you give monkeys nicotine in the first place?
///
{l}Do eggs go in first? Of course not, you assalope. Cans, set up like soldiers readying for battle. Then boxes of Cheez‑It (no, it’s singular—go ahead, look it up in Claude. I’ll wait).
<waits, checks watch for daily step count, readies to brag>
///
{l}What’s that? Yes, of course I put produce in a separate bag. Which I happen to line with frozen burritos, a shortstop’s base check to cool my celery stalks.
What’s that mean?
You do like basketball, right?
///
While we’re at it, you should know that when I lace my shoes, they always come out perfectly even. I took lessons from the Lace‑King of Winooski, who doesn’t accept just anyone, and who only answers to a special knock at his studio, which happens to be located in a janitor’s closet inside a fro‑yo shop - an excellent choice because it’s low‑key, and you wouldn’t know about it anyway if I didn’t tell you.
///
{l}Anyhoo, no flex, but my credit‑card tap‑to‑tip time is at least 0.8 seconds faster than yours.
That’s because I’m dialed-in and don’t just wave my card around the reader willy‑nilly. <watches as you tap another patron’s leg with your medical marijuana card>
My technique includes a micro‑flip of my wrist, lower left, soft, like I’m washing the undercarriage of a baby with a bamboo hand cloth.
///
{l}Speaking of tips, when I dine out I stare‑tip: straight into the server’s corneas, doing long division, silently sliding decimal points until I land on 20% without so much as blinking. And when I finally do blink, it’s in Morse, alerting them: Dover Sole. From a trawler. North Pacific. If they blink back, I add 5%
///
{x}Tipping, by the way, should be a surprise. Keep them guessing: higher, sometimes, because I’m generous and considerate; lower, more often than not, because you have to earn it, you sesquipedalianist.
///
I’m no expert, but I am excellent at cardboard box mutilation.
My X‑Acto blade is from Brazil, sharpened each evening at dusk, the preferred sharpening hour of serious sharpeners. And I’m ambidextrous, so I can open recycling bags with any appendage, arranging statistically sound cardboard trapezoids with surgical precision. Some say it might be ESP or something, but I’m no witch, please.
///
{l}I know I come off as humble, but I should let you know I can peel stickers off their backing with one finger. And I can hang pictures on the wall without measuring, just by using my keen sense of eyeballery (yes, even a diptych - which also tells you I'm real good at spelling).
///
{l}All of this to say, I’ve got no honorary degree from anywhere, nor an IQ test that says I’m not a Mensa.
{l}And while some people cure diseases, others build bridges, and a few speak six languages, well - so what?
///
Because while you excel at gardening and math and public speaking, I possess elite abilities in everyday fields nobody tracks - and, if we're being honest about the numbers, it's really the sport of everyday life that might be the true measure of a man.
(or woman, because I'm also trained to understand gender, even if I can admit I'm no psychometrician.)
^^^
{s}Dave Balter, June 2026`;

const WRITING = {
  buttondown: 'https://buttondown.com/balter/archive/',
  medium: 'https://medium.com/@davebalter',
  instagram: 'https://www.instagram.com/baltererer/',
};

// davebalter.com "Spyglass" collections (suggestions; free text is allowed for new ones).
// Keep to 8 max — the homepage Spyglass section shows at most 8 collections.
const CATEGORIES = ['Work and $', 'Everyday Living', 'Music', 'Love & People', 'Designs of Death', "Writer's Thoughts", 'Altered States', 'Hugless Identity'];

// Hand-picked "gateway" pieces — the front doors shown to new tool users.
// The thank-you card rotates through these on each visit.
// Hooks are starting points — tighten them in your own voice anytime.
const FEATURED = [
  { title: 'The Pool Guy', hook: 'He came to clean the pool. He stayed to rearrange my life.', url: 'https://buttondown.com/balter/archive/the-pool-guy/' },
  { title: 'The Hand', hook: 'The smallest gesture, and everything it was quietly holding.', url: 'https://buttondown.com/balter/archive/the-hand/' },
  { title: 'Jew to Jew', hook: 'On belonging, discomfort, and the things we only say to our own.', url: 'https://buttondown.com/balter/archive/jew-to-jew/' },
  { title: 'The Impossible Why', hook: 'my friend blair died at 47...', url: 'https://buttondown.com/balter/archive/the-impossible-why/' },
];

export default function InstagramSlides() {
  const isWatermarkRoute = window.location.pathname === '/watermark';
  const [showWatermark, setShowWatermark] = useState(isWatermarkRoute);
  const [showPageNumbers, setShowPageNumbers] = useState(true);
  const [madeWithSlides, setMadeWithSlides] = useState({});
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

  const [pieceTitle, setPieceTitle] = useState('');
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
  const [showThanks, setShowThanks] = useState(false);
  const [featured] = useState(() => FEATURED[Math.floor(Math.random() * FEATURED.length)]);
  const [publishPass, setPublishPass] = useState(() => (typeof localStorage !== 'undefined' && localStorage.getItem('davebalter_pass')) || '');
  const [publishUnlocked, setPublishUnlocked] = useState(() => typeof localStorage !== 'undefined' && !!localStorage.getItem('davebalter_pass'));
  const [publishDate, setPublishDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [publishEngagement, setPublishEngagement] = useState('');
  const [publishCategory, setPublishCategory] = useState('');
  const [publishStatus, setPublishStatus] = useState(''); // '', 'publishing', 'success', or 'error: ...'
  const [publishUrl, setPublishUrl] = useState('');
  const [publishSlug, setPublishSlug] = useState(''); // set when editing an imported story, so re-publish overwrites it
  const [importSlug, setImportSlug] = useState('');
  const [importStatus, setImportStatus] = useState(''); // '', 'loading', 'loaded', or 'error: ...'
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
      .replace(/^\s*>+\s?/gm, '')          // leading > indent markers
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

  const loadExample = () => {
    setEssay(SAMPLE_ESSAY);
    setPieceTitle('The Sport of Everyday Life');
    setSlides(SAMPLE_ESSAY.split('///').map(slide => slide.trim()).filter(slide => slide.length > 0));
  };

  const parseTextSegments = (text) => {
    const segments = [];
    let currentText = '';
    let bold = false, italic = false, strike = false;
    let currentSize = 'normal';
    let i = 0;

    const addSegment = () => {
      if (currentText) {
        segments.push({
          text: currentText,
          bold, italic, strike,
          size: currentSize
        });
        currentText = '';
      }
    };

    while (i < text.length) {
      if (text[i] === '~') {
        addSegment();
        strike = !strike;
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
      // ** = bold, * = italic, *** = both (handled as ** then *)
      else if (text[i] === '*' && text[i+1] === '*') {
        addSegment();
        bold = !bold;
        i += 2;
      }
      else if (text[i] === '*') {
        addSegment();
        italic = !italic;
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

      if (segment.bold) style.fontWeight = 'bold';
      if (segment.italic) style.fontStyle = 'italic';
      if (segment.strike) style.textDecoration = 'line-through';
      return <span key={i} style={style}>{segment.text}</span>;
    });
  };

  const renderToCanvas = async (text, index, contentSlideCount) => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const slideOverrides = styles.slideSpecific[index] || {};
    const scale = slideOverrides.scale || 1;
    const slideColors = {
      gradientStart: slideOverrides.colors?.gradientStart || styles.colors.gradientStart,
      gradientMiddle: slideOverrides.colors?.gradientMiddle || styles.colors.gradientMiddle,
      gradientEnd: slideOverrides.colors?.gradientEnd || styles.colors.gradientEnd,
      text: slideOverrides.colors?.text || styles.colors.text,
    };

    ctx.clearRect(0, 0, 1080, 1080);
    const gradient = ctx.createLinearGradient(0, 0, 1080, 1080);
    gradient.addColorStop(0, slideColors.gradientStart);
    gradient.addColorStop(0.5, slideColors.gradientMiddle);
    gradient.addColorStop(1, slideColors.gradientEnd);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 1080, 1080);

    const renderLine = (line, x, y, fontSize) => {
      const scaledSize = fontSize * parseFloat(scale);
      ctx.fillStyle = slideColors.text;
      const maxWidth = 1000 - x;
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
            bold: segment.bold,
            italic: segment.italic,
            strike: segment.strike,
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

          const fontPrefix = `${item.italic ? 'italic ' : ''}${item.bold ? 'bold ' : ''}`;
          ctx.font = `${fontPrefix}${adjustedSize}px ${styles.fontFamily}`;

          ctx.fillText(item.text, currentX, currentY);

          if (item.strike) {
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

        const fontPrefix = `${item.italic ? 'italic ' : ''}${item.bold ? 'bold ' : ''}`;
        ctx.font = `${fontPrefix}${adjustedSize}px ${styles.fontFamily}`;
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
      let trimmedLine = lines[i].trim();

      // Leading '>' marks indentation; each '>' adds one indent level
      let indentLevel = 0;
      while (trimmedLine.startsWith('>')) {
        indentLevel += 1;
        trimmedLine = trimmedLine.slice(1).trim();
      }
      const indentOffset = indentLevel * 60;

      if (i === 0 && index === 0) {
        fontSize = styles.fontSize.normal;
        xPos = 80 + indentOffset;
      } else if (trimmedLine.startsWith('-')) {
        fontSize = styles.fontSize.bullet;
        xPos = 110 + indentOffset;
        ctx.fillText('•', 80 + indentOffset, currentY);
      } else {
        fontSize = styles.fontSize.normal;
        xPos = 80 + indentOffset;
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
      ctx.fillStyle = slideColors.text;
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

    if (madeWithSlides[index]) {
      ctx.textAlign = 'left';
      ctx.globalAlpha = 0.25;
      ctx.font = `${14 * scale}px ${styles.fontFamily}`;
      ctx.fillText('mystoryshelf.com', 50, 1050);
      ctx.globalAlpha = 1.0;
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
  }, [slides, styles, showWatermark, showPageNumbers, madeWithSlides, totalPagesOverride]);

  useEffect(() => {
    renderAllSlides();
  }, [renderAllSlides]);

  const slugify = (text) => text.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

  const downloadSlide = (dataUrl, index) => {
    const link = document.createElement('a');
    const prefix = pieceTitle.trim() ? slugify(pieceTitle) : 'slide';
    link.download = `${prefix}-${String(index + 1).padStart(2, '0')}.png`;
    link.href = dataUrl;
    link.click();
  };

  const downloadAll = () => {
    slideImages.forEach((img, i) => {
      setTimeout(() => downloadSlide(img, i), i * 200);
    });
    setShowThanks(true);
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

    const pdfName = pieceTitle.trim() ? `${slugify(pieceTitle)}.pdf` : 'slides.pdf';
    pdf.save(pdfName);
    setShowThanks(true);
  };

  // --- Publish to davebalter.com -------------------------------------------
  const hexTriple = (hex) => `${parseInt(hex.slice(1, 3), 16)},${parseInt(hex.slice(3, 5), 16)},${parseInt(hex.slice(5, 7), 16)}`;

  // Resize an inserted photo (data URL) to web size and return base64 (no prefix).
  const resizeForWeb = (dataUrl, maxDim = 1280, quality = 0.86) => new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
      const w = Math.round(img.width * scale);
      const h = Math.round(img.height * scale);
      const c = document.createElement('canvas');
      c.width = w; c.height = h;
      c.getContext('2d').drawImage(img, 0, 0, w, h);
      resolve(c.toDataURL('image/jpeg', quality).split(',')[1]);
    };
    img.onerror = reject;
    img.src = dataUrl;
  });

  const buildEssayMarkdown = (photoAfterStr) => {
    const c = styles.colors;
    const fm = [
      '---',
      `title: ${pieceTitle.trim()}`,
      `category: ${publishCategory.trim()}`,
      `date: ${publishDate}`,
      `font: ${styles.fontFamily}`,
      `top: ${hexTriple(c.gradientStart)}`,
      `mid: ${hexTriple(c.gradientMiddle)}`,
      `bot: ${hexTriple(c.gradientEnd)}`,
      `text: ${hexTriple(c.text)}`,
      `engagement: ${parseInt(publishEngagement, 10) || 0}`,
      `photoAfter: ${photoAfterStr}`,
      '---',
    ].join('\n');
    return `${fm}\n${essay.trim()}\n`;
  };

  const unlockPublish = () => {
    if (!publishPass.trim()) return;
    localStorage.setItem('davebalter_pass', publishPass.trim());
    setPublishUnlocked(true);
  };

  // "r,g,b" -> "#rrggbb"
  const tripleToHex = (t) => '#' + (t || '').split(',').map(n => (parseInt(n, 10) || 0).toString(16).padStart(2, '0')).join('');

  // Pull a published story back into the editor so it can be edited and re-published.
  const importFromDavebalter = async () => {
    if (!importSlug.trim()) { setImportStatus('error: enter a story slug or davebalter.com link'); return; }
    setImportStatus('loading');
    try {
      const res = await fetch('/api/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ passphrase: publishPass, slug: importSlug.trim() }),
      });
      const data = await res.json();
      if (!data.success) {
        if (res.status === 401) { setPublishUnlocked(false); localStorage.removeItem('davebalter_pass'); }
        setImportStatus('error: ' + (data.error || 'could not load story'));
        return;
      }

      // Split frontmatter / body.
      const m = /^---\n([\s\S]*?)\n---\n?([\s\S]*)$/.exec(data.markdown);
      if (!m) { setImportStatus('error: could not parse that story file'); return; }
      const fm = {};
      m[1].split('\n').forEach(line => {
        const i = line.indexOf(':');
        if (i > -1) fm[line.slice(0, i).trim()] = line.slice(i + 1).trim();
      });
      const body = m[2].trim();

      if (fm.images && !body) {
        setImportStatus('error: this is an image-only (art-baked) carousel — it can\'t be edited here');
        return;
      }

      // Restore text, title, date, engagement.
      setPieceTitle(fm.title || '');
      setEssay(body);
      setSlides(body.split('///').map(s => s.trim()).filter(Boolean));
      if (fm.date) setPublishDate(fm.date);
      setPublishEngagement(fm.engagement ? String(parseInt(fm.engagement, 10) || 0) : '');
      setPublishCategory(fm.category || '');

      // Restore font + colors.
      setStyles(prev => ({
        ...prev,
        fontFamily: fm.font || prev.fontFamily,
        colors: {
          gradientStart: fm.top ? tripleToHex(fm.top) : prev.colors.gradientStart,
          gradientMiddle: fm.mid ? tripleToHex(fm.mid) : prev.colors.gradientMiddle,
          gradientEnd: fm.bot ? tripleToHex(fm.bot) : prev.colors.gradientEnd,
          text: fm.text ? tripleToHex(fm.text) : prev.colors.text,
        },
        slideSpecific: {},
      }));

      // Restore photos at their positions. photoAfter: "0=cover.jpg;4=a.jpg,b.jpg" (0 = cover).
      const byName = {};
      (data.photos || []).forEach(p => { byName[p.name] = p.dataUrl; });
      const placed = {};
      (fm.photoAfter || '').split(';').map(s => s.trim()).filter(Boolean).forEach(part => {
        const eq = part.indexOf('=');
        if (eq < 0) return;
        const pos = parseInt(part.slice(0, eq), 10);
        if (Number.isNaN(pos)) return;
        const urls = part.slice(eq + 1).split(',').map(n => byName[n.trim()]).filter(Boolean);
        if (urls.length) placed[pos] = urls;
      });
      setInsertedImages(placed);

      setPublishSlug(data.slug); // re-publish overwrites this same story
      setPublishStatus('');
      setPublishUrl('');
      setImportStatus(`loaded — editing "${fm.title || data.slug}". Edit, then Publish to update it.`);
    } catch (err) {
      setImportStatus('error: ' + err.message);
    }
  };

  const publishToDavebalter = async () => {
    if (!pieceTitle.trim()) { setPublishStatus('error: add a Piece Title first (used for the title and URL)'); return; }
    if (!publishCategory.trim()) { setPublishStatus('error: pick a Category first (so it lands in the right filter on the site)'); return; }
    setPublishStatus('publishing');
    setPublishUrl('');
    try {
      // Map inserted photos -> files + photoAfter (position key = "after slide N"; 0 = cover)
      const photos = [];
      const parts = [];
      const positions = Object.keys(insertedImages).map(Number).sort((a, b) => a - b);
      for (const pos of positions) {
        const imgs = insertedImages[pos] || [];
        const names = [];
        for (let idx = 0; idx < imgs.length; idx++) {
          const src = imgs[idx];
          // Animated GIFs: upload the original bytes untouched (re-encoding would flatten them to one frame).
          const isGif = /^data:image\/gif/i.test(src);
          const name = `photo-${pos}-${idx}.${isGif ? 'gif' : 'jpg'}`;
          names.push(name);
          const dataBase64 = isGif ? src.split(',')[1] : await resizeForWeb(src);
          photos.push({ name, dataBase64 });
        }
        if (names.length) parts.push(`${pos}=${names.join(',')}`);
      }
      const essayMarkdown = buildEssayMarkdown(parts.join(';'));

      // Vercel rejects request bodies over ~4.5MB, so a big photo/GIF would fail silently.
      const payloadChars = photos.reduce((n, p) => n + (p.dataBase64 ? p.dataBase64.length : 0), 0);
      if (payloadChars > 4_200_000) {
        const mb = (payloadChars / 1.37e6).toFixed(1);
        setPublishStatus(`error: photos total ~${mb}MB — too large to publish through the tool (limit ~4MB). GIFs are usually the culprit; use a smaller/shorter one, or ask to place it directly.`);
        return;
      }

      const res = await fetch('/api/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ passphrase: publishPass, essayMarkdown, slug: publishSlug || slugify(pieceTitle), title: pieceTitle.trim(), photos }),
      });
      const data = await res.json();
      if (data.success) {
        setPublishStatus('success');
        setPublishUrl(data.url);
      } else {
        if (res.status === 401) { setPublishUnlocked(false); localStorage.removeItem('davebalter_pass'); }
        setPublishStatus('error: ' + (data.error || 'publish failed'));
      }
    } catch (err) {
      setPublishStatus('error: ' + err.message);
    }
  };

  return (
    <div className="h-screen flex flex-col">
      <canvas ref={canvasRef} width={1080} height={1080} className="hidden" />

      {/* Header */}
      <div className="py-3 px-6 text-center border-b border-gray-200 shrink-0">
        <h1 className="text-2xl font-semibold tracking-tight" style={{color: '#1a1916'}}>StoryShelf Slides</h1>
        <p className="text-xs" style={{color: '#8a8880'}}>Turn your writing into beautiful carousel slides.</p>
        <p className="text-xs mt-0.5" style={{color: '#a89f8c'}}>
          a free tool by{' '}
          <a
            href="https://davebalter.com"
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-2 hover:text-[#6b6860] transition-colors"
          >
            Dave Balter — read the stories at davebalter.com →
          </a>
        </p>
      </div>

      {/* Desktop nudge — only shown on small screens, where the split layout is cramped */}
      <div className="sm:hidden shrink-0 px-4 py-2 text-center text-xs border-b" style={{ background: '#fbf6ea', color: '#8a7a4f', borderColor: '#f0e7d0' }}>
        Best on a desktop — the editor and live preview sit side by side.
      </div>

      {/* Split Pane */}
      <div className="flex flex-1 min-h-0">

        {/* LEFT PANE — Editor & Controls */}
        <div className="w-1/2 overflow-y-auto p-6 border-r border-gray-200">

      {/* How it works */}
      <div className="mb-6 p-4 border border-gray-200 rounded-xl bg-gray-50">
        <p className="text-sm font-semibold mb-2" style={{ color: '#1a1916' }}>How it works</p>
        <ol className="space-y-1 text-sm" style={{ color: '#6b6860' }}>
          <li><span className="font-semibold" style={{ color: '#1a1916' }}>1.</span> Write your piece, then paste it into the editor below.</li>
          <li><span className="font-semibold" style={{ color: '#1a1916' }}>2.</span> Break it into slides with <code className="bg-gray-200 px-1 rounded text-xs">///</code> and style the text using the formatting reference.</li>
          <li><span className="font-semibold" style={{ color: '#1a1916' }}>3.</span> Pick a font and give the piece a title.</li>
          <li><span className="font-semibold" style={{ color: '#1a1916' }}>4.</span> Hit <span className="font-semibold" style={{ color: '#1a1916' }}>Generate Slides</span>, then download PNGs for Instagram or a PDF for LinkedIn.</li>
        </ol>
      </div>

      {/* Style Controls */}
      <div className="mb-6 p-5 border border-gray-200 rounded-xl bg-white shadow-sm">
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

      {/* Piece Title */}
      <div className="mb-4">
        <label className="block text-sm mb-1">Piece Title</label>
        <Input
          value={pieceTitle}
          onChange={e => setPieceTitle(e.target.value)}
          placeholder="e.g. The Pool Guy — used for download filenames"
          className="max-w-md"
        />
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
            className="w-full h-80 mb-4"
            placeholder="Paste your essay here. Use /// to separate slides. Use - for bullets. Use > to indent a line (>> for deeper). Font formatting: *italic*, **bold**, ~strikethrough~, {s} small, {l} large, {x} extra large. Add ^^^ line for extra spacing."
          />
        )}
        <div className="flex items-center gap-4">
          <Button onClick={generateSlides}>
            Generate Slides
          </Button>
          <button
            onClick={loadExample}
            className="text-sm underline underline-offset-2 transition-colors"
            style={{ color: '#8a8880' }}
          >
            or try an example →
          </button>
        </div>
        <div className="mt-4 p-4 border rounded-lg bg-gray-50 text-sm text-gray-600">
          <p className="font-semibold text-gray-700 mb-2">Formatting Reference</p>
          <div className="grid grid-cols-2 gap-x-8 gap-y-1">
            <div><code className="bg-gray-200 px-1 rounded">///</code> — slide break</div>
            <div><code className="bg-gray-200 px-1 rounded">*text*</code> — <em>italic</em></div>
            <div><code className="bg-gray-200 px-1 rounded">**text**</code> — <strong>bold</strong></div>
            <div><code className="bg-gray-200 px-1 rounded">***text***</code> — <strong><em>bold italic</em></strong></div>
            <div><code className="bg-gray-200 px-1 rounded">~text~</code> — <span style={{textDecoration: 'line-through'}}>strikethrough</span></div>
            <div><code className="bg-gray-200 px-1 rounded">- text</code> — bullet point</div>
            <div><code className="bg-gray-200 px-1 rounded">&gt; text</code> — indent (<code className="bg-gray-200 px-1 rounded">&gt;&gt;</code> deeper)</div>
            <div><code className="bg-gray-200 px-1 rounded">^^^</code> — extra vertical spacing</div>
            <div><code className="bg-gray-200 px-1 rounded">{'{s}'}</code> — small text (70%)</div>
            <div><code className="bg-gray-200 px-1 rounded">{'{l}'}</code> — large text (130%)</div>
            <div><code className="bg-gray-200 px-1 rounded">{'{x}'}</code> — extra large text (170%)</div>
            <div>blank line — paragraph break</div>
          </div>
        </div>
      </div>

        </div>{/* END LEFT PANE */}

        {/* RIGHT PANE — Slides Preview */}
        <div className="w-1/2 overflow-y-auto p-6">

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

      {/* Thank-you card — appears the moment slides are exported (peak gratitude) */}
      {showThanks && slideImages.length > 0 && (
        <div
          className="mb-6 relative p-6 border border-[#e7e1d6] rounded-2xl shadow-sm text-left"
          style={{ background: 'linear-gradient(160deg, #fdfbf7 0%, #f6f1e8 100%)' }}
        >
          <button
            onClick={() => setShowThanks(false)}
            className="absolute top-3 right-3 text-[#b3b0a8] hover:text-[#6b6860] transition-colors"
            aria-label="Dismiss"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-2 mb-3">
            <span
              className="inline-flex items-center justify-center w-7 h-7 rounded-full"
              style={{ background: '#1a1916', color: '#f6f1e8' }}
            >
              <PenLine className="w-3.5 h-3.5" />
            </span>
            <span className="text-xs font-medium uppercase tracking-wider" style={{ color: '#a89f8c' }}>
              Slides ready — thank you
            </span>
          </div>

          <p className="text-sm leading-relaxed mb-4" style={{ color: '#5f5c54' }}>
            Oh hello there. I'm Dave. This tool is free, and it'll stay free — no fee, no catch. In lieu
            of payment, maybe you'll read one of my pieces (I publish every Tuesday — mini obsessions
            about life as we know it, or imagine we do).
          </p>

          {/* Featured gateway story (rotates per visit) */}
          <a
            href={featured.url}
            target="_blank"
            rel="noopener noreferrer"
            className="group block p-4 rounded-xl border border-[#ece6da] mb-4 transition-colors hover:border-[#d8cfbd]"
            style={{ background: 'rgba(255,255,255,0.7)' }}
          >
            <span className="block text-[11px] uppercase tracking-wider mb-1" style={{ color: '#a89f8c' }}>
              Start here
            </span>
            <span className="block text-base font-semibold" style={{ color: '#1a1916' }}>
              {featured.title}
            </span>
            <span className="block text-sm mt-0.5 mb-2 leading-snug" style={{ color: '#6b6860' }}>
              {featured.hook}
            </span>
            <span className="inline-flex items-center text-sm font-medium" style={{ color: '#1a1916' }}>
              Read it
              <ArrowUpRight className="w-4 h-4 ml-1 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </span>
          </a>

          {/* Subscribe (primary) + quiet secondary links */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <Button asChild>
              <a href={WRITING.buttondown} target="_blank" rel="noopener noreferrer">
                Subscribe on Buttondown
                <ArrowUpRight className="w-4 h-4 ml-2" />
              </a>
            </Button>
            <span className="text-xs" style={{ color: '#a89f8c' }}>
              or find me on{' '}
              <a href={WRITING.medium} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-[#6b6860] transition-colors">Medium</a>
              {' · '}
              <a href={WRITING.instagram} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-[#6b6860] transition-colors">Instagram</a>
            </span>
          </div>
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
              <div className="mb-4 flex items-center gap-3">
                <select
                  value={styles.slideSpecific[index]?.scale || '1'}
                  onChange={e => {
                    const newSlideSpecific = { ...styles.slideSpecific };
                    newSlideSpecific[index] = { ...newSlideSpecific[index], scale: e.target.value };
                    setStyles({ ...styles, slideSpecific: newSlideSpecific });
                  }}
                  className="p-2 border rounded"
                >
                  <option value="0.8">Small (80%)</option>
                  <option value="0.9">Medium (90%)</option>
                  <option value="1">Default (100%)</option>
                  <option value="1.1">Large (110%)</option>
                </select>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const newSlideSpecific = { ...styles.slideSpecific };
                    if (newSlideSpecific[index]?.colors) {
                      const { colors, ...rest } = newSlideSpecific[index];
                      newSlideSpecific[index] = rest;
                    } else {
                      newSlideSpecific[index] = {
                        ...newSlideSpecific[index],
                        colors: {
                          gradientStart: styles.colors.gradientStart,
                          gradientMiddle: styles.colors.gradientMiddle,
                          gradientEnd: styles.colors.gradientEnd,
                          text: styles.colors.text,
                        }
                      };
                    }
                    setStyles({ ...styles, slideSpecific: newSlideSpecific });
                  }}
                  className={styles.slideSpecific[index]?.colors ? 'border-blue-400 text-blue-600' : ''}
                >
                  {styles.slideSpecific[index]?.colors ? '✓ Custom Colors' : '+ Custom Colors'}
                </Button>
                {styles.slideSpecific[index]?.colors && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const newSlideSpecific = { ...styles.slideSpecific };
                      const { colors, ...rest } = newSlideSpecific[index];
                      newSlideSpecific[index] = rest;
                      setStyles({ ...styles, slideSpecific: newSlideSpecific });
                    }}
                    className="text-red-500 border-red-300 hover:bg-red-50"
                  >
                    Reset
                  </Button>
                )}
              </div>
              {styles.slideSpecific[index]?.colors && (
                <div className="mb-4 grid grid-cols-4 gap-2">
                  {[
                    ['gradientStart', 'Top'],
                    ['gradientMiddle', 'Mid'],
                    ['gradientEnd', 'Bot'],
                    ['text', 'Text'],
                  ].map(([key, label]) => (
                    <div key={key}>
                      <label className="block text-xs mb-1">{label}</label>
                      <Input
                        type="color"
                        value={styles.slideSpecific[index].colors[key]}
                        onChange={e => {
                          const newSlideSpecific = { ...styles.slideSpecific };
                          newSlideSpecific[index] = {
                            ...newSlideSpecific[index],
                            colors: { ...newSlideSpecific[index].colors, [key]: e.target.value }
                          };
                          setStyles({ ...styles, slideSpecific: newSlideSpecific });
                        }}
                        className="h-8"
                      />
                    </div>
                  ))}
                </div>
              )}

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
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setMadeWithSlides(prev => ({...prev, [index]: !prev[index]}))}
                  className={madeWithSlides[index] ? 'border-green-400 text-green-600' : ''}
                >
                  {madeWithSlides[index] ? '✓ mystoryshelf.com' : '+ mystoryshelf.com'}
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
                  const prefix = pieceTitle.trim() ? slugify(pieceTitle) : 'slide';
                  link.download = `${prefix}-blank.png`;
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


      {/* Publish to davebalter.com — hidden from the public (needs ?publish in the URL, or a prior unlock) */}
      {(new URLSearchParams(window.location.search).has('publish') || publishUnlocked) && (
        <div className="mt-4 p-5 border border-gray-200 rounded-xl bg-white shadow-sm">
          <h3 className="text-lg font-semibold mb-2" style={{ color: '#1a1916' }}>Publish to davebalter.com</h3>
          {!publishUnlocked ? (
            <div>
              <p className="text-sm mb-3" style={{ color: '#8a8880' }}>Private — for the site owner. Enter the passphrase to enable publishing.</p>
              <div className="flex gap-2 max-w-sm">
                <Input
                  type="password"
                  value={publishPass}
                  onChange={e => setPublishPass(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') unlockPublish(); }}
                  placeholder="Passphrase"
                />
                <Button variant="outline" onClick={unlockPublish}>Unlock</Button>
              </div>
            </div>
          ) : (
            <div>
              {/* Edit an existing story: pull it back into the editor */}
              <div className="mb-4 pb-4 border-b border-gray-100">
                <label className="block text-xs mb-1" style={{ color: '#8a8880' }}>Edit an existing story — paste its slug or davebalter.com link</label>
                <div className="flex gap-2 max-w-lg">
                  <Input
                    value={importSlug}
                    onChange={e => setImportSlug(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') importFromDavebalter(); }}
                    placeholder="the-hand   (or  https://davebalter.com/?essay=the-hand)"
                  />
                  <Button variant="outline" onClick={importFromDavebalter} disabled={importStatus === 'loading'}>
                    {importStatus === 'loading' ? (<><Loader2 className="w-4 h-4 mr-2 animate-spin" />Loading…</>) : 'Load'}
                  </Button>
                </div>
                {importStatus === 'loading' && <p className="mt-2 text-xs" style={{ color: '#8a8880' }}>Pulling text, colors, font and photos…</p>}
                {importStatus.startsWith('loaded') && <p className="mt-2 text-xs text-green-600">{importStatus}</p>}
                {importStatus.startsWith('error') && <p className="mt-2 text-xs text-red-600">{importStatus.replace(/^error:\s*/, '')}</p>}
              </div>

              <p className="text-sm mb-4" style={{ color: '#8a8880' }}>
                Publishes this piece (text, colors, font, and inserted photos) to davebalter.com.
                Uses the <span className="font-medium">Piece Title</span> above for the title and URL.
                {publishSlug && <span className="block mt-1 text-amber-600">Editing <span className="font-medium">{publishSlug}</span> — publishing will update that story (same URL).{' '}<button onClick={() => setPublishSlug('')} className="underline">publish as a new story instead</button></span>}
              </p>
              <div className="flex flex-wrap items-end gap-4 mb-4">
                <div>
                  <label className="block text-xs mb-1" style={{ color: '#8a8880' }}>Publish date</label>
                  <Input type="date" value={publishDate} onChange={e => setPublishDate(e.target.value)} className="w-44" />
                </div>
                <div>
                  <label className="block text-xs mb-1" style={{ color: '#8a8880' }}>Likes (optional, for “Most loved”)</label>
                  <Input type="number" value={publishEngagement} onChange={e => setPublishEngagement(e.target.value)} placeholder="0" className="w-32" />
                </div>
                <div>
                  <label className="block text-xs mb-1" style={{ color: '#8a8880' }}>Category (pick or type a new one)</label>
                  <Input list="davebalter-categories" value={publishCategory} onChange={e => setPublishCategory(e.target.value)} placeholder="e.g. Work & Money" className="w-52" />
                  <datalist id="davebalter-categories">
                    {CATEGORIES.map(c => <option key={c} value={c} />)}
                  </datalist>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Button
                  onClick={publishToDavebalter}
                  disabled={publishStatus === 'publishing' || !pieceTitle.trim() || !publishCategory.trim()}
                  style={{ background: '#1a1916', color: 'white' }}
                  className="hover:opacity-90"
                >
                  {publishStatus === 'publishing'
                    ? (<><Loader2 className="w-4 h-4 mr-2 animate-spin" />Publishing…</>)
                    : (<><Send className="w-4 h-4 mr-2" />Publish to davebalter.com</>)}
                </Button>
                <button
                  onClick={() => { localStorage.removeItem('davebalter_pass'); setPublishUnlocked(false); setPublishPass(''); }}
                  className="text-xs underline"
                  style={{ color: '#b3b0a8' }}
                >
                  lock
                </button>
              </div>
              {!pieceTitle.trim() && (
                <p className="mt-2 text-xs text-amber-600">Add a Piece Title above first — it becomes the essay title and URL.</p>
              )}
              {pieceTitle.trim() && !publishCategory.trim() && (
                <p className="mt-2 text-xs text-amber-600">Pick a Category above — every story needs one so it shows in the right filter.</p>
              )}
              {publishStatus === 'success' && (
                <p className="mt-3 text-sm text-green-600">
                  Published! It’ll be live in a minute.{' '}
                  {publishUrl && <a href={publishUrl} target="_blank" rel="noopener noreferrer" className="underline">View it</a>}
                </p>
              )}
              {publishStatus.startsWith('error') && (
                <p className="mt-3 text-sm text-red-600">{publishStatus.replace(/^error:\s*/, '')}</p>
              )}
            </div>
          )}
        </div>
      )}

        </div>{/* END RIGHT PANE */}

      </div>{/* END Split Pane */}

      {/* Minimal footer — ambient links for anyone who leaves without exporting */}
      <footer className="shrink-0 py-2 px-6 text-center border-t border-gray-100">
        <p className="text-xs" style={{ color: '#b3b0a8' }}>
          Dave Balter
          {' · '}
          <a href={WRITING.buttondown} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-[#6b6860] transition-colors">Buttondown</a>
          {' · '}
          <a href={WRITING.medium} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-[#6b6860] transition-colors">Medium</a>
          {' · '}
          <a href={WRITING.instagram} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-[#6b6860] transition-colors">Instagram</a>
        </p>
      </footer>

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
