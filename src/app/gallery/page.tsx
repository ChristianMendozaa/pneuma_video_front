"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function GalleryPage() {
    const router = useRouter();
    const [videos, setVideos] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const fetchGallery = async () => {
        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_VIDEO_API_URL}/list`);
            if (!res.ok) throw new Error(await res.text());
            const data = await res.json();
            setVideos(data.videos);
        } catch (e: any) {
            alert("Error cargando galería: " + e.message);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchGallery();

        // Auto-refresh the gallery every 15 seconds to catch PROCESSING updates
        const interval = setInterval(fetchGallery, 15000);
        return () => clearInterval(interval);
    }, []);

    const handleDownload = (url: string) => {
        window.open(url, "_blank");
    };

    return (
        <div style={{ paddingBottom: 60 }}>
            <h1>Tus Anuncios</h1>
            <p>Historial de tus anuncios generados.</p>

            {isLoading ? (
                <div style={{ textAlign: "center", marginTop: 40 }}><p className="animate-pulse">Cargando plataforma...</p></div>
            ) : videos.length === 0 ? (
                <div className="glass-card" style={{ textAlign: "center" }}>
                    <p style={{ marginBottom: 0 }}>Aún no hay anuncios. ¡Ve a generarlos!</p>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    {videos.map((vid) => (
                        <div key={vid.video_id} className="glass-card" style={{ padding: '16px', margin: 0 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                                <span className="badge" style={{ background: vid.status === "COMPLETED" ? 'var(--accent-gradient)' : vid.status === "FAILED" ? '#e74c3c' : '#3498db' }}>
                                    {vid.status}
                                </span>
                                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                                    {new Date(vid.created_at).toLocaleDateString()}
                                </span>
                            </div>

                            {vid.status === "COMPLETED" && vid.final_url && (
                                <div className="video-container ratio-16-9" style={{ marginBottom: 16 }}>
                                    <video src={vid.final_url} controls playsInline />
                                </div>
                            )}

                            {vid.status === "PROCESSING" && (
                                <div style={{ textAlign: "center", padding: "20px 0", background: "rgba(0,0,0,0.2)", borderRadius: 12, marginBottom: 16 }}>
                                    <p className="animate-pulse" style={{ margin: 0, fontSize: "0.85rem" }}>Renderizando IA en la nube...</p>
                                </div>
                            )}

                            <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginBottom: 16 }}>
                                <strong>Guión IA:</strong> <i>{vid.metadata?.script_text || vid.metadata?.prompt_visual || "Sin datos"}</i>
                            </div>

                            <div style={{ display: 'flex', gap: '8px' }}>
                                <button
                                    className="btn btn-secondary"
                                    style={{ padding: '10px' }}
                                    onClick={() => router.push(`/wait/${vid.video_id}`)}
                                >
                                    Ver Detalles
                                </button>

                                {vid.status === "COMPLETED" && (
                                    <button
                                        className="btn btn-primary"
                                        style={{ padding: '10px' }}
                                        onClick={() => handleDownload(vid.final_url)}
                                    >
                                        Descargar
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
