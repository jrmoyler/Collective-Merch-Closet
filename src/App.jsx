import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft, ArrowRight, Check, CoatHanger, Heart, MagnifyingGlass,
  Plus, ShareNetwork, ShoppingBagOpen, Sparkle, SpinnerGap, X,
} from "@phosphor-icons/react";
import { DIVISIONS, MERCH } from "./data.js";
import { MODEL_IMAGE } from "./model.js";
import MERCH_SPRITE from "./merch-sprite.js";

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

const TYPES = [
  ["all", "All pieces"], ["tops", "Tops"], ["layers", "Layers"],
  ["bottoms", "Bottoms"], ["shoes", "Footwear"], ["accessories", "Accessories"],
];

function price(value) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value || 0);
}

function ProductCard({ item, onOpen, onAdd, selected }) {
  return (
    <article className="product-card">
      <button className="product-image-button" type="button" onClick={() => onOpen(item)} aria-label={`Open ${item.product.name}`}>
        <MerchImage item={item} />
        <span className="division-chip" style={{ "--accent": item.division.accent }}>{item.division.name}</span>
        <span className="card-index">{String(item.index).padStart(3, "0")}</span>
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

function OutfitStudio({ open, outfit, onClose, onRemove, onClear }) {
  const [generatedImage, setGeneratedImage] = useState("");
  const [generating, setGenerating] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    setGeneratedImage("");
    setMessage("");
  }, [outfit]);

  const generate = async () => {
    if (!outfit.length || generating) return;
    setGenerating(true);
    setMessage("");
    try {
      const itemImages = await Promise.all(outfit.map(cropMerchImage));
      const response = await fetch("/api/try-on", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemIds: outfit.map((item) => item.index), itemImages }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error || "The fitting room is warming up.");
      setGeneratedImage(body.image);
      setMessage("Your Collective fit is ready.");
    } catch (error) {
      setMessage(error.message);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <aside className={open ? "studio is-open" : "studio"} aria-hidden={!open}>
      <div className="studio-head">
        <div><small>JR’S PRIVATE FITTING ROOM</small><h2>Outfit Studio</h2></div>
        <button className="round-close" type="button" onClick={onClose} aria-label="Close outfit studio"><X size={20} /></button>
      </div>
      <div className="model-stage">
        <img src={generatedImage || MODEL_IMAGE} alt={generatedImage ? "JR wearing the selected Collective Merch outfit" : "JR, the fitting-room model"} />
        {!generatedImage && <div className="model-stage-label"><span>MODEL 001</span><strong>JR MOYLER</strong></div>}
        <div className="stage-orbits" aria-hidden="true">
          {outfit.slice(0, 3).map((item, index) => <MerchImage key={item.index} item={item} style={{ "--slot": index }} decorative />)}
        </div>
      </div>
      <div className="studio-selection">
        <div className="studio-selection-head">
          <span>{outfit.length} / 3 pieces selected</span>
          {!!outfit.length && <button type="button" onClick={onClear}>Clear fit</button>}
        </div>
        {!outfit.length ? (
          <div className="studio-empty"><CoatHanger size={30} weight="light" /><p>Add up to three pieces from any division to build a look.</p></div>
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
        {generating ? "Tailoring your look…" : "Generate try-on"}
      </button>
      {message && <p className={generatedImage ? "studio-message success" : "studio-message"}>{message}</p>}
      <p className="studio-note">Identity anchored to your supplied reference portrait. Garment details are preserved from the selected catalog photography.</p>
    </aside>
  );
}

export function App() {
  const [activeDivision, setActiveDivision] = useState("all");
  const [activeType, setActiveType] = useState("all");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(null);
  const [outfit, setOutfit] = useState([]);
  const [studioOpen, setStudioOpen] = useState(false);
  const [favorites, setFavorites] = useState(() => new Set());

  const division = DIVISIONS.find((entry) => entry.id === activeDivision);
  const filtered = useMemo(() => {
    const query = search.toLowerCase().trim();
    return MERCH.filter((item) => activeDivision === "all" || item.divisionId === activeDivision)
      .filter((item) => activeType === "all" || item.part === activeType)
      .filter((item) => !query || [
        item.product.name, item.product.style, item.product.description, item.division.name, item.ocr,
      ].join(" ").toLowerCase().includes(query));
  }, [activeDivision, activeType, search]);

  const toggleOutfit = (item) => {
    setOutfit((current) => {
      if (current.some((piece) => piece.index === item.index)) return current.filter((piece) => piece.index !== item.index);
      const next = [...current, item];
      return next.length > 3 ? next.slice(1) : next;
    });
    setStudioOpen(true);
  };

  const toggleFavorite = (index) => {
    setFavorites((current) => {
      const next = new Set(current);
      if (next.has(index)) next.delete(index); else next.add(index);
      return next;
    });
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
          <button type="button" aria-label="Search" onClick={() => document.querySelector(".search-field input")?.focus()}><MagnifyingGlass size={20} /></button>
          <button type="button" aria-label="Favorites"><Heart size={20} />{favorites.size > 0 && <span>{favorites.size}</span>}</button>
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
              <button className="text-cta" type="button" onClick={() => setStudioOpen(true)}><Sparkle size={16} /> Style JR</button>
            </div>
            <dl className="hero-stats"><div><dt>342</dt><dd>Drive assets</dd></div><div><dt>373</dt><dd>Catalog pieces</dd></div><div><dt>21</dt><dd>Brand worlds</dd></div></dl>
          </div>
          <div className="hero-model">
            <div className="model-frame"><img src={MODEL_IMAGE} alt="JR Moyler, model for the Collective Merch Closet" /></div>
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
            <div className="no-results"><CoatHanger size={38} weight="light" /><h3>No pieces found</h3><button type="button" onClick={() => { setSearch(""); setActiveType("all"); }}>Reset filters</button></div>
          ) : (
            <div className="product-grid">
              {filtered.map((item) => <ProductCard key={item.index} item={item} onOpen={setSelected} onAdd={toggleOutfit} selected={outfit.some((piece) => piece.index === item.index)} />)}
            </div>
          )}
        </section>
      </main>

      <footer><div className="footer-mark">✦</div><h2>ARCHITECTING A HUMANE FUTURE.</h2><p>Collective AI Inc · Columbus, Ohio</p><button type="button"><ShareNetwork size={17} /> Share the closet</button></footer>

      <ProductViewer item={selected} outfit={outfit} onToggle={toggleOutfit} onClose={() => setSelected(null)} />
      <OutfitStudio open={studioOpen} outfit={outfit} onClose={() => setStudioOpen(false)} onRemove={toggleOutfit} onClear={() => setOutfit([])} />
      {!studioOpen && <button className="floating-studio-button" type="button" onClick={() => setStudioOpen(true)}><Sparkle size={17} weight="fill" /> Fitting room <span>{outfit.length}</span></button>}
    </div>
  );
}
