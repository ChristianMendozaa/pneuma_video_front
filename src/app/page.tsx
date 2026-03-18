"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();
  const [images, setImages] = useState<File[]>([]);
  const [formData, setFormData] = useState({
    prompt: "",
    aspect_ratio: "9:16",
  });

  const [isGeneratingVideo, setIsGeneratingVideo] = useState(false);

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



  const createVideo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.prompt.trim()) {
      alert("Por favor ingresa un prompt descriptivo.");
      return;
    }

    setIsGeneratingVideo(true);

    const form = new FormData();
    form.append("prompt", formData.prompt);
    form.append("aspect_ratio", formData.aspect_ratio);
    images.forEach((img) => form.append("images", img));

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_VIDEO_API_URL}/generate`, {
        method: "POST",
        body: form,
      });

      if (!res.ok) throw new Error(await res.text());

      const json = await res.json();
      
      localStorage.setItem(`script_context_${json.video_id}`, JSON.stringify({
        aspect_ratio: formData.aspect_ratio,
        prompt: formData.prompt
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

        <form onSubmit={createVideo}>
          <div className="input-group">
            <label>Subir Imágenes (Max 3)</label>
            <div className="file-upload-area">
              <input type="file" multiple accept="image/*" onChange={handleImageChange} />

              {images.length === 0 ? (
                <p style={{ marginTop: 8, marginBottom: 0 }}>Toca para agregar fotos (Opcional)</p>
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
            <label>Prompt (Instrucciones)</label>
            <textarea name="prompt" value={formData.prompt} onChange={handleFormChange} required placeholder="Describe la cámara, iluminación, música..." rows={4} />
          </div>

          <div className="input-group">
            <label>Formato</label>
            <select name="aspect_ratio" value={formData.aspect_ratio} onChange={handleFormChange}>
              <option value="16:9">💻 Horizontal (16:9)</option>
              <option value="9:16">📱 Vertical (9:16)</option>
            </select>
          </div>

          <button type="submit" className="btn btn-primary" disabled={isGeneratingVideo}>
            {isGeneratingVideo ? "Procesando IA..." : "Renderizar Video IA"}
          </button>
        </form>
    </div>
  );
}
