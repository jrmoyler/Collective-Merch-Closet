import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft, ArrowRight, Check, CoatHanger, DownloadSimple, Heart, MagicWand, MagnifyingGlass,
  Plus, ShareNetwork, Shuffle, ShoppingBagOpen, Sparkle, SpinnerGap, X,
} from "@phosphor-icons/react";
import { DIVISIONS, MERCH } from "./data.js";
import { MODELS, MODEL_SLOTS, DEFAULT_MODEL_ID, getModel } from "./models.js";
import { pairOutfit, outfitTotal, MAX_OUTFIT } from "./stylist.js";

// Served as static files (cached by the service worker) instead of being
// embedded in the JS bundle, so the app shell stays small enough for mobile.
const MODEL_IMAGE = "/models/jr.jpg";
const MERCH_SPRITE = "/merch-sprite.webp";

const SPRITE_COLUMNS = 18;
const SPRITE_ROWS = 19;
const SPRITE_CELL = 180;

function spritePosition(index) {
  const offset = index - 1;
  const column = offset % SPRITE_COLUMNS;
  const row = Math.floor(offset / SPRITE_COLUMNS);
  return `${(column / (SPRITE_COLUMNS - 1)) * 100}% ${(row / (SPRITE_ROWS - 1)) * 100}%`;
}

function MerchImage({ item, className = "", style, decorative = false }) {
  const label = `${item.division.name} ${item.product.name}`;
  return <span className={`merch-art ${className}`.trim()} style={{ ...style, backgroundPosition: spritePosition(item.index) }} role={decorative ? undefined : "img"} aria-label={decorative ? undefined : label} aria-hidden={decorative || undefined} />;
}

let spriteImagePromise;
function loadSpriteImage() {
  if (!spriteImagePromise) spriteImagePromise = new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("The merchandise atlas could not be opened."));
    image.src = MERCH_SPRITE;
  });
  return spriteImagePromise;
}

async function cropMerchImage(item) {
  const image = await loadSpriteImage();
  const offset = item.index - 1;
  const canvas = document.createElement("canvas");
  canvas.width = SPRITE_CELL;
  canvas.height = SPRITE_CELL;
  const context = canvas.getContext("2d");
  context.drawImage(image, (offset % SPRITE_COLUMNS) * SPRITE_CELL, Math.floor(offset / SPRITE_COLUMNS) * SPRITE_CELL, SPRITE_CELL, SPRITE_CELL, 0, 0, SPRITE_CELL, SPRITE_CELL);
  return canvas.toDataURL("image/webp", 0.9);
}

function loadImageElement(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("An image for the style board could not be loaded."));
    image.src = src;
  });
}

// Offline fallback for the fitting room: when the AI key isn't connected (or
// the network is down), compose the model and the selected garments into a
// lookbook-style board entirely on the client, so "Generate try-on" always
// produces a shareable image.
async function composeStyleBoard(outfit, model) {
  const [modelImage, ...garments] = await Promise.all([
    loadImageElement(model.image),
    ...outfit.map(async (item) => ({ item, image: await loadImageElement(await cropMerchImage(item)) })),
  ]);

  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 1536;
  const context = canvas.getContext("2d");

  const background = context.createLinearGradient(0, 0, 0, canvas.height);
  background.addColorStop(0, "#0b1020");
  background.addColorStop(1, "#101a30");
  context.fillStyle = background;
  context.fillRect(0, 0, canvas.width, canvas.height);

  context.textBaseline = "alphabetic";
  context.fillStyle = "#d4a843";
  context.font = "600 21px 'Instrument Sans Variable', Arial, sans-serif";
  context.fillText("C O L L E C T I V E   M E R C H   C L O S E T", 64, 92);
  context.fillStyle = "#f5f5f5";
  context.font = "760 62px 'Instrument Sans Variable', Arial, sans-serif";
  context.fillText("STYLE BOARD", 62, 158);
  context.fillStyle = "#8b9bae";
  context.font = "600 19px 'Instrument Sans Variable', Arial, sans-serif";
  context.textAlign = "right";
  context.fillText(`${model.code} · ${model.name}`, canvas.width - 64, 92);
  context.textAlign = "left";

  // Model panel, cover-cropped like the studio stage. With four or more
  // garments the right rail switches to two columns, so the panel narrows to
  // make room.
  const twoColumns = garments.length > 3;
  const panel = { x: 64, y: 208, width: twoColumns ? 430 : 540, height: 1132 };
  context.save();
  context.beginPath();
  context.rect(panel.x, panel.y, panel.width, panel.height);
  context.clip();
  const scale = Math.max(panel.width / modelImage.width, panel.height / modelImage.height);
  const drawWidth = modelImage.width * scale;
  const drawHeight = modelImage.height * scale;
  context.drawImage(modelImage, panel.x + (panel.width - drawWidth) / 2, panel.y + (panel.height - drawHeight) * 0.25, drawWidth, drawHeight);
  const fade = context.createLinearGradient(0, panel.y + panel.height - 200, 0, panel.y + panel.height);
  fade.addColorStop(0, "rgba(5,10,24,0)");
  fade.addColorStop(1, "rgba(5,10,24,.9)");
  context.fillStyle = fade;
  context.fillRect(panel.x, panel.y, panel.width, panel.height);
  context.restore();
  context.strokeStyle = "#d4a843";
  context.lineWidth = 2;
  context.strokeRect(panel.x, panel.y, panel.width, panel.height);
  context.fillStyle = "#d4a843";
  context.font = "600 17px 'Instrument Sans Variable', Arial, sans-serif";
  context.fillText(model.code, panel.x + 24, panel.y + panel.height - 58);
  context.fillStyle = "#f5f5f5";
  context.font = "760 27px 'Instrument Sans Variable', Arial, sans-serif";
  context.fillText(model.name, panel.x + 24, panel.y + panel.height - 26);

  // Garment cards on the right rail: one large column for up to three pieces,
  // a two-column grid for four to six.
  const cardSize = twoColumns ? 200 : 306;
  const cardStartX = twoColumns ? 530 : 650;
  const cardPitchY = twoColumns ? 274 : 384;
  garments.forEach(({ item, image }, index) => {
    const column = twoColumns ? index % 2 : 0;
    const row = twoColumns ? Math.floor(index / 2) : index;
    const card = { x: cardStartX + column * (cardSize + 30), y: 208 + row * cardPitchY, size: cardSize };
    context.fillStyle = "#111b2d";
    context.fillRect(card.x, card.y, card.size, card.size);
    context.drawImage(image, card.x, card.y, card.size, card.size);
    context.strokeStyle = "#26334d";
    context.lineWidth = 2;
    context.strokeRect(card.x, card.y, card.size, card.size);
    context.fillStyle = "#d4a843";
    context.font = `600 ${twoColumns ? 12 : 15}px 'Instrument Sans Variable', Arial, sans-serif`;
    context.fillText(item.division.name.toUpperCase(), card.x, card.y + card.size + (twoColumns ? 24 : 30), card.size);
    context.fillStyle = "#f5f5f5";
    context.font = `700 ${twoColumns ? 16 : 21}px 'Instrument Sans Variable', Arial, sans-serif`;
    context.fillText(item.product.name, card.x, card.y + card.size + (twoColumns ? 46 : 58), card.size);
  });

  context.strokeStyle = "#26334d";
  context.beginPath();
  context.moveTo(64, 1424);
  context.lineTo(canvas.width - 64, 1424);
  context.stroke();
  context.fillStyle = "#8b9bae";
  context.font = "600 17px 'Instrument Sans Variable', Arial, sans-serif";
  context.fillText("HAND-STYLED BOARD — AI TRY-ON RETURNS WHEN THE KEY IS CONNECTED", 64, 1468);
  context.fillStyle = "#d4a843";
  context.textAlign = "right";
  context.fillText("COLLECTIVE AI ✦", canvas.width - 64, 1468);
  context.textAlign = "left";

  return canvas.toDataURL("image/png");
}

const TYPES = [
  ["all", "All pieces"], ["tops", "Tops"], ["layers", "Layers"],
  ["bottoms", "Bottoms"], ["shoes", "Footwear"], ["accessories", "Accessories"],
];

function price(value) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value || 0);
}

function ProductCard({ item, onOpen, onAdd, selected, favorite, onFavorite }) {
  return (
    <article className="product-card">
      <button className="product-image-button" type="button" onClick={() => onOpen(item)} aria-label={`Open ${item.product.name}`}>
        <MerchImage item={item} />
        <span className="division-chip" style={{ "--accent": item.division.accent }}>{item.division.name}</span>
        <span className="card-index">{String(item.index).padStart(3, "0")}</span>
      </button>
      <button className={favorite ? "fav-button is-fav" : "fav-button"} type="button" onClick={() => onFavorite(item.index)} aria-pressed={favorite} aria-label={favorite ? `Remove ${item.product.name} from favorites` : `Save ${item.product.name} to favorites`}>
        <Heart size={15} weight={favorite ? "fill" : "regular"} />
      </button>
      <div className="product-card-copy">
        <button type="button" className="product-title-button" onClick={() => onOpen(item)}>
          <span>{item.product.name}</span>
          <small>{item.product.style}</small>
        </button>
        <div className="product-card-foot">
          <strong>{price(item.product.price)}</strong>
          <button className={selected ? "quick-add selected" : "quick-add"} type="button" onClick={() => onAdd(item)} aria-label={selected ? "Remove from outfit" : "Add to outfit"}>
            {selected ? <Check size={15} weight="bold" /> : <Plus size={15} weight="bold" />}
          </button>
        </div>
      </div>
    </article>
  );
}

function ProductViewer({ item, outfit, onToggle, onClose }) {
  if (!item) return null;
  const added = outfit.some((piece) => piece.index === item.index);
  return (
    <div className="product-viewer-overlay" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <aside className="product-viewer" role="dialog" aria-modal="true" aria-label={item.product.name}>
        <button className="round-close" type="button" onClick={onClose} aria-label="Close product"><X size={20} /></button>
        <div className="viewer-image-wrap">
          <MerchImage item={item} />
          <span className="viewer-watermark">{item.division.number} / 21</span>
        </div>
        <div className="viewer-copy">
          <p className="viewer-division" style={{ color: item.division.accent }}>{item.division.name} · {item.division.industry}</p>
          <h2>{item.product.name}</h2>
          <p className="viewer-style">{item.product.style}</p>
          <p className="viewer-description">{item.product.description}</p>
          <div className="viewer-tags">
            {item.division.tags.map((tag) => <span key={tag}>#{tag.replaceAll(" ", "")}</span>)}
          </div>
          <div className="viewer-price-row">
            <strong>{price(item.product.price)}</strong>
            <span>Catalog SKU {item.product.sku}</span>
          </div>
          <button className={added ? "primary-cta is-added" : "primary-cta"} type="button" onClick={() => onToggle(item)}>
            {added ? <Check size={18} weight="bold" /> : <CoatHanger size={18} />}
            {added ? "Added to your fit" : "Try this piece"}
          </button>
        </div>
      </aside>
    </div>
  );
}

function OutfitStudio({ open, outfit, onClose, onRemove, onClear, onAutoStyle, modelId, onModelChange }) {
  const [generatedImage, setGeneratedImage] = useState("");
  const [generating, setGenerating] = useState(false);
  const [message, setMessage] = useState("");
  const [isBoard, setIsBoard] = useState(false);
  const model = getModel(modelId) || MODELS[0];

  useEffect(() => {
    setGeneratedImage("");
    setMessage("");
    setIsBoard(false);
  }, [outfit, modelId]);

  const generate = async () => {
    if (!outfit.length || generating) return;
    setGenerating(true);
    setMessage("");
    setIsBoard(false);
    try {
      const itemImages = await Promise.all(outfit.map(cropMerchImage));
      let response = null;
      try {
        response = await fetch("/api/try-on", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ itemIds: outfit.map((item) => item.index), itemImages, modelId: model.id }),
        });
      } catch {
        response = null; // Network down or API unreachable — fall through to the style board.
      }
      const body = response ? await response.json().catch(() => ({})) : {};
      if (response?.ok) {
        setGeneratedImage(body.image);
        setMessage("Your Collective fit is ready.");
      } else if (!response || response.status === 503 || response.status === 404) {
        // 503 = no API key connected; 404 = no serverless function (local
        // preview); null = network down. All fall back to the on-device board.
        setGeneratedImage(await composeStyleBoard(outfit, model));
        setIsBoard(true);
        setMessage("The AI fitting room isn't connected yet, so here's your hand-styled board — still yours to save and share. The full AI try-on switches on automatically once the key is live.");
      } else {
        throw new Error(body.error || "The fitting room is warming up.");
      }
    } catch (error) {
      setMessage(error.message);
    } finally {
      setGenerating(false);
    }
  };

  const downloadLook = () => {
    const link = document.createElement("a");
    link.href = generatedImage;
    link.download = isBoard ? "collective-style-board.png" : "collective-fit.png";
    link.click();
  };

  const shareLook = async () => {
    try {
      const blob = await (await fetch(generatedImage)).blob();
      const file = new File([blob], isBoard ? "collective-style-board.png" : "collective-fit.png", { type: blob.type || "image/png" });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: "My Collective fit" });
      } else {
        downloadLook();
      }
    } catch {
      // Sharing was dismissed or unavailable; nothing to clean up.
    }
  };

  return (
    <aside className={open ? "studio is-open" : "studio"} aria-hidden={!open} inert={!open}>
      <div className="studio-head">
        <div><small>THE PRIVATE FITTING ROOM</small><h2>Outfit Studio</h2></div>
        <button className="round-close" type="button" onClick={onClose} aria-label="Close outfit studio"><X size={20} /></button>
      </div>
      <div className="model-picker" role="radiogroup" aria-label="Choose your model">
        <small>CHOOSE YOUR MODEL</small>
        {MODELS.map((entry) => (
          <button key={entry.id} type="button" role="radio" aria-checked={entry.id === model.id} className={entry.id === model.id ? "model-chip is-active" : "model-chip"} onClick={() => onModelChange(entry.id)}>
            <img src={entry.image} alt="" />
            <span><strong>{entry.name}</strong><small>{entry.code} · {entry.detail}</small></span>
            {entry.id === model.id && <Check size={14} weight="bold" />}
          </button>
        ))}
        {Array.from({ length: Math.max(0, MODEL_SLOTS - MODELS.length) }, (_, slot) => (
          <div key={slot} className="model-chip is-placeholder" aria-hidden="true">
            <span className="slot-art">✦</span>
            <span><strong>MODEL {String(MODELS.length + slot + 1).padStart(3, "0")}</strong><small>Awaiting model sheet</small></span>
          </div>
        ))}
      </div>
      <div className="model-stage">
        <img src={generatedImage || model.image} alt={generatedImage ? `${model.name} wearing the selected Collective Merch outfit` : `${model.name}, the fitting-room model`} />
        {!generatedImage && <div className="model-stage-label"><span>{model.code}</span><strong>{model.name}</strong></div>}
        <div className="stage-orbits" aria-hidden="true">
          {outfit.slice(0, 3).map((item, index) => <MerchImage key={item.index} item={item} style={{ "--slot": index }} decorative />)}
          {outfit.length > 3 && <span className="orbit-more">+{outfit.length - 3}</span>}
        </div>
      </div>
      <div className="stylist-row">
        <small>AI STYLIST</small>
        <div>
          <button type="button" onClick={() => onAutoStyle("complete")} title="Keep your picks and fill the empty slots">
            <MagicWand size={15} /> {outfit.length ? "Complete my fit" : "Style me"}
          </button>
          <button type="button" onClick={() => onAutoStyle("surprise")} title="Start fresh with a full auto-paired look">
            <Shuffle size={15} /> Surprise me
          </button>
        </div>
      </div>
      <div className="studio-selection">
        <div className="studio-selection-head">
          <span>{outfit.length} / {MAX_OUTFIT} pieces selected{outfit.length ? ` · ${price(outfitTotal(outfit))}` : ""}</span>
          {!!outfit.length && <button type="button" onClick={onClear}>Clear fit</button>}
        </div>
        {!outfit.length ? (
          <div className="studio-empty"><CoatHanger size={30} weight="light" /><p>Add up to six pieces from any division — or let the AI stylist pair a look for you.</p></div>
        ) : (
          <div className="fit-list">
            {outfit.map((item) => (
              <div className="fit-item" key={item.index}>
                <MerchImage item={item} decorative />
                <div><strong>{item.product.name}</strong><span>{item.division.name}</span></div>
                <button type="button" onClick={() => onRemove(item)} aria-label={`Remove ${item.product.name}`}><X size={15} /></button>
              </div>
            ))}
          </div>
        )}
      </div>
      <button className="generate-fit-button" type="button" disabled={!outfit.length || generating} onClick={generate}>
        {generating ? <SpinnerGap size={18} className="spin" /> : <Sparkle size={18} weight="fill" />}
        {generating ? "Tailoring your look…" : generatedImage ? "Generate another take" : "Generate try-on"}
      </button>
      {generatedImage && !generating && (
        <div className="look-actions">
          <button type="button" onClick={downloadLook}><DownloadSimple size={16} /> Save look</button>
          <button type="button" onClick={shareLook}><ShareNetwork size={16} /> Share look</button>
        </div>
      )}
      {message && <p className={generatedImage ? "studio-message success" : "studio-message"}>{message}</p>}
      <p className="studio-note">Identity anchored to the chosen model sheet. Garment details are preserved from the selected catalog photography.</p>
    </aside>
  );
}

function readStored(key, fallback) {
  try {
    const value = JSON.parse(localStorage.getItem(key));
    return Array.isArray(value) ? value : fallback;
  } catch {
    return fallback;
  }
}

function writeStored(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage may be full or blocked (private browsing); the app still works.
  }
}

export function App() {
  const [activeDivision, setActiveDivision] = useState("all");
  const [activeType, setActiveType] = useState("all");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(null);
  const [outfit, setOutfit] = useState(() =>
    readStored("cmc-outfit", []).map((index) => MERCH.find((item) => item.index === index)).filter(Boolean).slice(0, MAX_OUTFIT));
  const [studioOpen, setStudioOpen] = useState(false);
  const [modelId, setModelId] = useState(() => {
    try {
      const stored = localStorage.getItem("cmc-model");
      return getModel(stored) ? stored : DEFAULT_MODEL_ID;
    } catch {
      return DEFAULT_MODEL_ID;
    }
  });
  const [favorites, setFavorites] = useState(() => new Set(readStored("cmc-favorites", [])));
  const [showFavorites, setShowFavorites] = useState(false);
  const [shareMessage, setShareMessage] = useState("");

  useEffect(() => writeStored("cmc-favorites", [...favorites]), [favorites]);
  useEffect(() => writeStored("cmc-outfit", outfit.map((item) => item.index)), [outfit]);
  useEffect(() => {
    try {
      localStorage.setItem("cmc-model", modelId);
    } catch {
      // Storage may be full or blocked (private browsing); the app still works.
    }
  }, [modelId]);

  useEffect(() => {
    const onKey = (event) => {
      if (event.key !== "Escape") return;
      if (selected) setSelected(null);
      else if (studioOpen) setStudioOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selected, studioOpen]);

  useEffect(() => {
    // The studio only overlays the page below 1181px; on desktop it shifts it.
    const lock = Boolean(selected) || (studioOpen && window.matchMedia("(max-width: 1180px)").matches);
    document.body.style.overflow = lock ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [selected, studioOpen]);

  const division = DIVISIONS.find((entry) => entry.id === activeDivision);
  const filtered = useMemo(() => {
    const query = search.toLowerCase().trim();
    return MERCH.filter((item) => activeDivision === "all" || item.divisionId === activeDivision)
      .filter((item) => activeType === "all" || item.part === activeType)
      .filter((item) => !showFavorites || favorites.has(item.index))
      .filter((item) => !query || [
        item.product.name, item.product.style, item.product.description, item.division.name, item.ocr,
      ].join(" ").toLowerCase().includes(query));
  }, [activeDivision, activeType, search, showFavorites, favorites]);

  const toggleOutfit = (item) => {
    setOutfit((current) => {
      if (current.some((piece) => piece.index === item.index)) return current.filter((piece) => piece.index !== item.index);
      const next = [...current, item];
      return next.length > MAX_OUTFIT ? next.slice(1) : next;
    });
    setStudioOpen(true);
  };

  const autoStyle = (mode) => {
    setOutfit((current) => (mode === "surprise"
      ? pairOutfit({ current: [], strategy: Math.random() < 0.5 ? "division" : "mix" })
      : pairOutfit({ current, strategy: "mix" })));
    setStudioOpen(true);
  };

  const toggleFavorite = (index) => {
    setFavorites((current) => {
      const next = new Set(current);
      if (next.has(index)) next.delete(index); else next.add(index);
      return next;
    });
  };

  const shareCloset = async () => {
    const url = window.location.origin + window.location.pathname;
    try {
      if (navigator.share) {
        await navigator.share({ title: "Collective Merch Closet", text: "Browse the Collective AI merch closet.", url });
      } else {
        await navigator.clipboard.writeText(url);
        setShareMessage("Link copied");
        setTimeout(() => setShareMessage(""), 2400);
      }
    } catch {
      // Sharing was dismissed or unavailable; nothing to clean up.
    }
  };

  return (
    <div className={studioOpen ? "site-shell studio-visible" : "site-shell"} style={{ "--merch-sprite": `url("${MERCH_SPRITE}")` }}>
      <header className="site-header">
        <a className="brand-lockup" href="#top" aria-label="Collective Merch home">
          <span className="brand-mark">✦</span>
          <span><strong>COLLECTIVE</strong><small>MERCH CLOSET</small></span>
        </a>
        <nav className="header-nav" aria-label="Main navigation">
          <a href="#closet">Closet</a><a href="#divisions">Divisions</a><button type="button" onClick={() => setStudioOpen(true)}>Fitting room</button>
        </nav>
        <div className="header-actions">
          <button type="button" className="search-jump" aria-label="Search" onClick={() => document.querySelector(".search-field input")?.focus()}><MagnifyingGlass size={20} /></button>
          <button type="button" className={showFavorites ? "is-active" : ""} aria-label="Show favorites only" aria-pressed={showFavorites} onClick={() => setShowFavorites((current) => !current)}><Heart size={20} weight={showFavorites ? "fill" : "regular"} />{favorites.size > 0 && <span>{favorites.size}</span>}</button>
          <button className="bag-button" type="button" onClick={() => setStudioOpen(true)}><ShoppingBagOpen size={20} /><span>{outfit.length}</span></button>
        </div>
      </header>

      <main id="top">
        <section className="hero">
          <div className="hero-copy">
            <p className="eyebrow">COLLECTIVE AI · COLUMBUS, OHIO · 2026</p>
            <h1>Wear the<br /><em>ecosystem.</em></h1>
            <p className="hero-deck">A living uniform system for builders, researchers, founders, and every intelligence shaping a humane future.</p>
            <div className="hero-actions">
              <a className="primary-cta" href="#closet">Enter the closet <ArrowRight size={18} /></a>
              <button className="text-cta" type="button" onClick={() => autoStyle("surprise")}><MagicWand size={16} /> Auto-style a fit</button>
            </div>
            <dl className="hero-stats"><div><dt>{MERCH.length}</dt><dd>Clothing pieces</dd></div><div><dt>{MODELS.length}</dt><dd>Models</dd></div><div><dt>{MAX_OUTFIT}</dt><dd>Fit slots</dd></div></dl>
          </div>
          <div className="hero-model">
            <div className="model-frame"><img src={MODEL_IMAGE} alt="JR Moyler, model for the Collective Merch Closet" fetchPriority="high" /></div>
            <div className="hero-model-card"><span>MODEL / FOUNDER</span><strong>JR MOYLER</strong><small>6'4" · Columbus, Ohio</small></div>
            <div className="hero-annotation">Your identity.<br />Every division.<br />One closet.</div>
          </div>
        </section>

        <section className="division-strip" id="divisions">
          <div className="section-label"><span>01</span><p>Browse by intelligence division</p></div>
          <div className="division-rail">
            <button type="button" className={activeDivision === "all" ? "active" : ""} onClick={() => setActiveDivision("all")}><span>00</span>All Worlds</button>
            {DIVISIONS.map((entry) => (
              <button type="button" key={entry.id} className={activeDivision === entry.id ? "active" : ""} onClick={() => setActiveDivision(entry.id)} style={{ "--accent": entry.accent }}>
                <span>{entry.number}</span>{entry.name}
              </button>
            ))}
          </div>
        </section>

        {division && (
          <section className="division-hero" style={{ "--accent": division.accent }}>
            <div className="division-number">{division.number}</div>
            <div><p>{division.industry}</p><h2>{division.name}</h2><h3>{division.tagline}</h3></div>
            <div className="division-tags">{division.tags.map((tag) => <span key={tag}>#{tag.replaceAll(" ", "")}</span>)}</div>
            <button type="button" onClick={() => setActiveDivision("all")}><ArrowLeft size={16} /> All divisions</button>
          </section>
        )}

        <section className="closet" id="closet">
          <div className="closet-toolbar">
            <div><p className="eyebrow">THE COMPLETE IMAGE ARCHIVE</p><h2>{division ? division.name : "The Collective Closet"}</h2></div>
            <label className="search-field"><MagnifyingGlass size={17} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search the closet" /><span>{filtered.length}</span></label>
          </div>
          <div className="type-tabs">
            {TYPES.map(([id, label]) => <button type="button" key={id} className={activeType === id ? "active" : ""} onClick={() => setActiveType(id)}>{label}</button>)}
          </div>
          {!filtered.length ? (
            <div className="no-results"><CoatHanger size={38} weight="light" /><h3>{showFavorites && !favorites.size ? "No favorites yet — tap the heart on any piece" : "No pieces found"}</h3><button type="button" onClick={() => { setSearch(""); setActiveType("all"); setShowFavorites(false); }}>Reset filters</button></div>
          ) : (
            <div className="product-grid">
              {filtered.map((item) => <ProductCard key={item.index} item={item} onOpen={setSelected} onAdd={toggleOutfit} selected={outfit.some((piece) => piece.index === item.index)} favorite={favorites.has(item.index)} onFavorite={toggleFavorite} />)}
            </div>
          )}
        </section>
      </main>

      <footer><div className="footer-mark">✦</div><h2>ARCHITECTING A HUMANE FUTURE.</h2><p>Collective AI Inc · Columbus, Ohio</p><button type="button" onClick={shareCloset}><ShareNetwork size={17} /> {shareMessage || "Share the closet"}</button></footer>

      <ProductViewer item={selected} outfit={outfit} onToggle={toggleOutfit} onClose={() => setSelected(null)} />
      <OutfitStudio open={studioOpen} outfit={outfit} onClose={() => setStudioOpen(false)} onRemove={toggleOutfit} onClear={() => setOutfit([])} onAutoStyle={autoStyle} modelId={modelId} onModelChange={setModelId} />
      {!studioOpen && <button className="floating-studio-button" type="button" onClick={() => setStudioOpen(true)}><Sparkle size={17} weight="fill" /> Fitting room <span>{outfit.length}</span></button>}
    </div>
  );
}
