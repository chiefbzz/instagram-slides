import React, { useState, useRef } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Maximize2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

const DEFAULT_ESSAY = '';

export default function InstagramSlides() {
  const [showWatermark, setShowWatermark] = useState(true);
  const [showPageNumbers, setShowPageNumbers] = useState(true);
  const [totalPagesOverride, setTotalPagesOverride] = useState(null);
  const [styles, setStyles] = useState({
    colors: {
      gradientStart: '#DABD7E',
      gradientMiddle: '#F5EBD2',
      gradientEnd: '#B26E2A',
      text: '#3E2B1C'
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
  const [preview, setPreview] = useState({ show: false, image: '' });
  const canvasRef = useRef(null);

  const fonts = [
    // Serif — literary, intimate
    'Playfair Display',
    'Lora',
    'Merriweather',
    'Libre Baskerville',
    'EB Garamond',
    'Crimson Text',
    'Source Serif 4',
    'Literata',
    'Spectral',
    'Cormorant Garamond',
    'Bitter',
    'Georgia',
    'Palatino',
    'Times New Roman',
    // Sans-serif — clean, modern
    'Inter',
    'Raleway',
    'Montserrat',
    'Open Sans',
    'Lato',
    'DM Sans',
    'Arial',
    'Helvetica',
    'Verdana',
    // Monospace — wry, observational
    'Space Mono',
    'IBM Plex Mono',
    'JetBrains Mono',
    'Courier New',
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

  const renderToCanvas = async (text, index) => {
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
      const totalPages = totalPagesOverride !== null ? totalPagesOverride : slides.length;
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

    return canvas.toDataURL('image/png');
  };

  return (
    <div className="p-4 max-w-screen-xl mx-auto">
      <canvas ref={canvasRef} width={1080} height={1080} className="hidden" />

      {/* Style Controls */}
      <div className="mb-8 p-4 border rounded-lg bg-gray-50">
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
          </div>
        </div>
      </div>

      {/* Text Input */}
      <div className="mb-8">
        <Textarea
          value={essay}
          onChange={e => setEssay(e.target.value)}
          className="w-full h-64 mb-4"
          placeholder="Paste your essay here. Use /// to separate slides. Use - for bullets. Font formatting: *italic*, **bold**, ~strikethrough~, {s} small, {l} large, {x} extra large. Add ^^^ line for extra spacing."
        />
        <Button onClick={generateSlides}>
          Generate Slides
        </Button>
      </div>

      {/* Slides Preview */}
      <div className="grid grid-cols-1 gap-8">
        {slides.map((slide, index) => (
          <div key={`slide-preview-${index}`} className="relative">
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

            <div className="relative mx-auto" style={{ width: '600px', height: '600px' }}>
              <div
                className="absolute inset-0 rounded-lg overflow-hidden"
                style={{
                  background: `linear-gradient(135deg, ${styles.colors.gradientStart} 0%, ${styles.colors.gradientMiddle} 50%, ${styles.colors.gradientEnd} 100%)`
                }}
              >
                <div
                  className="absolute inset-0 pt-32 px-12 pb-12 overflow-auto"
                  style={{
                    fontFamily: styles.fontFamily,
                    color: styles.colors.text
                  }}
                >
                  {(() => {
                    const lines = slide.split('\n');
                    const elements = [];
                    let paragraphGroup = [];

                    const addParagraphGroup = () => {
                      if (paragraphGroup.length > 0) {
                        elements.push(
                          <div key={`group-${elements.length}`} className="mb-10">
                            {paragraphGroup}
                          </div>
                        );
                        paragraphGroup = [];
                      }
                    };

                    lines.forEach((line, i) => {
                      if (!line.trim()) {
                        addParagraphGroup();
                        return;
                      }
                      if (line.trim() === '^^^') {
                        addParagraphGroup();
                        elements.push(<div key={`spacer-${i}`} className="h-16"></div>);
                        return;
                      }

                      const scale = styles.slideSpecific[index]?.scale || 1;
                      const style = {
                        fontSize: `${20 * scale}px`,
                        fontWeight: 'normal',
                        paddingLeft: line.startsWith('-') ? '1.5em' : '0',
                        lineHeight: '1.6',
                        marginBottom: line.startsWith('-') ? '10px' : '0px',
                      };

                      paragraphGroup.push(
                        <p key={i} style={style}>
                          {line.startsWith('-') && '• '}
                          {processText(line.replace(/^-\s*/, ''))}
                        </p>
                      );
                    });

                    addParagraphGroup();

                    return elements;
                  })()}

                  {showPageNumbers && (
                    <div className="absolute bottom-8 left-0 right-0 text-center text-sm opacity-70">
                      {index + 1} / {totalPagesOverride !== null ? totalPagesOverride : slides.length}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-4 text-center">
              <Button
                variant="outline"
                onClick={async () => {
                  const image = await renderToCanvas(slide, index);
                  setPreview({ show: true, image });
                }}
              >
                <Maximize2 className="w-4 h-4 mr-2" />
                Preview Slide {index + 1}
              </Button>
            </div>
          </div>
        ))}
      </div>

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
