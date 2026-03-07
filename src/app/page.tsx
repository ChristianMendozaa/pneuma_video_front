"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();
  const [images, setImages] = useState<File[]>([]);
  const [formData, setFormData] = useState({
    product_name: "",
    product_description: "",
    aspect_ratio: "9:16",
    video_style: "Auto",
    music_genre: "Pop Latino",
    custom_theme: "",
  });

  const [isLoadingScripts, setIsLoadingScripts] = useState(false);
  const [isGeneratingVideo, setIsGeneratingVideo] = useState(false);
  const [scripts, setScripts] = useState<any[]>([]);
  const [selectedScriptId, setSelectedScriptId] = useState<number | null>(null);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selected = Array.from(e.target.files);
      if (selected.length > 3) {
        alert("Máximo 3 imágenes permitidas");
        return;
      }
      setImages(selected);
    }
  };

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const fetchScripts = async (e: React.FormEvent) => {
    e.preventDefault();
    if (images.length === 0) {
      alert("Debes subir al menos 1 imagen");
      return;
    }

    setIsLoadingScripts(true);
    setScripts([]);
    setSelectedScriptId(null);

    const dataPayload = {
      product_name: formData.product_name,
      product_description: formData.product_description,
      technical_settings: { aspect_ratio: formData.aspect_ratio },
      preferences: {
        video_style: formData.video_style,
        music_genre: formData.music_genre,
        custom_theme: formData.custom_theme || "Ventas persuasivas",
      },
    };

    const form = new FormData();
    form.append("data", JSON.stringify(dataPayload));
    images.forEach((img) => form.append("images", img));

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_SCRIPT_API_URL}/generate-scripts`, {
        method: "POST",
        body: form,
      });

      if (!res.ok) throw new Error(await res.text());

      const json = await res.json();
      setScripts(json.opciones);
    } catch (error: any) {
      alert("Error generando guiones: " + error.message);
    } finally {
      setIsLoadingScripts(false);
    }
  };

  const createVideo = async () => {
    if (selectedScriptId === null) return;
    const selectedScript = scripts.find((s) => s.id === selectedScriptId);
    if (!selectedScript) return;

    setIsGeneratingVideo(true);

    const form = new FormData();
    form.append("prompt_veo_visual", selectedScript.prompt_veo_visual);
    form.append("prompt_veo_audio", selectedScript.prompt_veo_audio);
    form.append("aspect_ratio", formData.aspect_ratio);
    form.append("script_text", selectedScript.texto_locucion);
    images.forEach((img) => form.append("images", img));

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_VIDEO_API_URL}/generate`, {
        method: "POST",
        body: form,
      });

      if (!res.ok) throw new Error(await res.text());

      const json = await res.json();
      // Guardar el guion seleccionado en localStorage para la posible Extensión luego
      localStorage.setItem(`script_context_${json.video_id}`, JSON.stringify({
        product_name: formData.product_name,
        product_description: formData.product_description,
        aspect_ratio: formData.aspect_ratio,
        preferences: {
          video_style: formData.video_style,
          music_genre: formData.music_genre,
          custom_theme: formData.custom_theme,
        },
        previous_script: selectedScript
      }));

      // Navegar a sala de espera
      router.push(`/wait/${json.video_id}`);
    } catch (error: any) {
      alert("Error creando video: " + error.message);
      setIsGeneratingVideo(false);
    }
  };

  return (
    <div>
      <h1>Generador de Anuncios</h1>
      <p>Crea anuncios de 8s listos para vender.</p>

      {!scripts.length ? (
        <form onSubmit={fetchScripts}>
          <div className="input-group">
            <label>Subir Imágenes (Max 3)</label>
            <div className="file-upload-area">
              <input type="file" multiple accept="image/*" onChange={handleImageChange} required />

              {images.length === 0 ? (
                <p style={{ marginTop: 8, marginBottom: 0 }}>Toca para agregar fotos</p>
              ) : (
                <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', marginTop: '12px', flexWrap: 'wrap' }}>
                  {images.map((img, idx) => (
                    <img
                      key={idx}
                      src={URL.createObjectURL(img)}
                      alt={`preview ${idx}`}
                      style={{ width: '60px', height: '60px', objectFit: 'cover', borderRadius: '8px', border: '2px solid var(--accent-orange)' }}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="input-group">
            <label>Nombre del Producto</label>
            <input name="product_name" value={formData.product_name} onChange={handleFormChange} required placeholder="Ej: Zapatillas Nike" />
          </div>

          <div className="input-group">
            <label>Descripción Corta</label>
            <textarea name="product_description" value={formData.product_description} onChange={handleFormChange} required placeholder="Descripción de venta..." rows={3} />
          </div>

          <div className="input-group" style={{ display: "flex", gap: "10px" }}>
            <div style={{ flex: 1 }}>
              <label>Formato</label>
              <select name="aspect_ratio" value={formData.aspect_ratio} onChange={handleFormChange}>
                <option value="16:9">💻 Horizontal (16:9)</option>
                <option value="9:16">📱 Vertical (9:16)</option>
              </select>
            </div>
            <div style={{ flex: 1 }}>
              <label>Estilo</label>
              <select name="video_style" value={formData.video_style} onChange={handleFormChange}>
                <option value="Auto">Auto Automático</option>
                <option value="Realista Cinemático">Realista Cinemático</option>
                <option value="Casero">Casero</option>
                <option value="Animación 3D">Animación 3D</option>
              </select>
            </div>
          </div>

          <button type="submit" className="btn btn-primary" disabled={isLoadingScripts}>
            {isLoadingScripts ? "Escribiendo Guiones..." : "1. Generar Guiones IA"}
          </button>
        </form>
      ) : (
        <div>
          <button className="badge" onClick={() => setScripts([])} style={{ border: 'none', background: 'var(--bg-secondary)', marginBottom: 16 }}>
            ← Volver a editar
          </button>

          <h2>Selecciona tu Locución</h2>
          <p>Elige el gancho hablado que más te convenga. (8 segundos renderizado).</p>

          {scripts.map((script) => (
            <div
              key={script.id}
              className={`glass-card selectable ${selectedScriptId === script.id ? "selected" : ""}`}
              onClick={() => setSelectedScriptId(script.id)}
            >
              <p style={{ color: "var(--text-primary)", fontWeight: 500, fontSize: "1.05rem", fontStyle: "italic", marginBottom: 0 }}>
                &quot;{script.texto_locucion}&quot;
              </p>
            </div>
          ))}

          <button
            className="btn btn-primary"
            style={{ marginTop: 24 }}
            disabled={selectedScriptId === null || isGeneratingVideo}
            onClick={createVideo}
          >
            {isGeneratingVideo ? "Procesando IA..." : "2. Renderizar IA"}
          </button>
        </div>
      )}
    </div>
  );
}
