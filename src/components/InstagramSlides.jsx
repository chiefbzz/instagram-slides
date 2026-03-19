import React, { useState, useRef } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Maximize2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

const DEFAULT_ESSAY = `Here's how one hosts a Ganjarama.

Oh — you don't know that term? I'm sorry, I'm getting ahead of myself. It's simply ganja + rama. Or, more precisely, an *extravagance of weed.* We good?
///
Ok, so the recipe is as follows.
///
You purchase enough weed to knock out a moderately-sized horse. It's better if you know a dealer, because they'll have weed coming out their ears, and grabbing four or five ounces at a discount is no matter.
///
(Do not deal weed unless you are a medical professional. Then deal it from a storefront, to appear all legitimate and whatnot.)
///
With your cornucopia of weed, you begin by inviting thirty good friends over. Ok, ok, you got me there, you don't have thirty *good* friends you'd smoke weed with.
///
For each year post-college, your *good* friend group will shrink, as will those who smoke weed, until the Venn between the two looks like the arc of a waning crescent moon, or that sliver of almond you shake onto your salad. So, childishness aside — and for obvious reasons — giddy up: one should throw a Ganjarama before the brain has fully developed.
///
Now about that invitation. They say the journey is the actual destination, which means you should get stoned to the gills and start scrapbooking. Whip out your copy of *High Times* and cut out photos of sticky red-haired buds; and *Relix* for that pic of Hendrix, and then steal your girlfriend's *Vogue* to capture some quips you'll edit into classic stoner terms.
///
(Your illegitimate dealer still has to cover some costs, so charge $5 a head, just to, um, *weed out the seeds from the stems*)
///
Timing your Ganjarama is important. Late at night makes the most sense, because the whole thing is fun for about forty-five minutes. After that, attendees will get loopy and occasionally funny, but mostly you'll just feel slightly anxious and awkward and wonder if you should have just made a night of watching Letterman, or why a party guest was talking to a doorknob or, wait, did someone just turn the stove on?
///
How to begin a Ganjarama? Well, you roll a big fat bone, maybe the length of a baby's arm and the thickness of a fully grown eggplant. You'll need to be creative here, creating a frankenstein of licked bits of Zig-Zag rolling papers, until you have a half-bent elbow and you need two hands to cradle it like a newborn.
///
To start, you'll want to create some natural tension, so upon arrival, box your thirty-four friends (some folks will sneak in) into your house's entryway designed for no more than ten people. Pack 'em in tight, like sardines, nose to nose and butt to butt; then, light up that huge bone and pass it all around.
///
(If the cops arrive, just call it an art-project or an experiment you're running for your psychology class, something about mass delirium or psychological safety.)
///
Wait long enough for a few of the more claustrophobic type to start having mild panic attacks, and people are shrieking to let them in. Then, with a bit of flair, thrust open the double doors into the main living room, where you'll have laid out stations as if a corporate buffet of hedonism: an ounce of herb piled near a four-foot Graphix bong, a tray of oblong joints. Pipes. An apple cored to smoke from. A homemade vaporizer.
///
On windowsills you'll have bowls of dry cereal (fruit loops and golden grahams), and some carrot sticks and celery in the kitchen. Globes of water and beer. Eyes will redden, and the air will soon choke with smoke.
///
Some will ask you why so much weed in one room, which will require you to rescind their invitation upon the spot.
///
Some forewarnings: a Ganjarama is mainly for professionals. You'll inadvertently want to invite a few friends unprepared for such an undertaking. Maybe they smoke occasionally, but never like this, and so they step up to the plate with all sorts of bravado, *hoovering three bongs and hitting passed joints at the same time.*
///
These people will likely wig and tweak and look about bug-eyed and frightened and ask you to hold their hand but then will spill the bong onto someone's lap and ruin your couch. And if you were to throw a Ganjarama again, say the following year, you'd be required to ban them under the guise of *managing the vibes.*
///
Mostly, a Ganjarama is about the statement. About the nature of weed before it became so strong that one tiny hit lets you *touch the fingertips of insanity.* About Bob Marley singing *Trenchtown Rock* or the laws of #hemp4victory or the experimentation of whippet-bong-whippet.
///
All of which is to say, you should host a Ganjarama only if it speaks directly to your soul or, I suppose, if you're bored and have nothing better to do.`;

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
    'Courier New',
    'Georgia',
    'Arial',
    'Times New Roman',
    'Helvetica',
    'Verdana',
    'Bookman',
    'Palatino',
    'Garamond'
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
