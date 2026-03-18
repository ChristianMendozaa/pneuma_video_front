"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";

export default function WaitScreen({ params }: { params: Promise<{ video_id: string }> }) {
    const router = useRouter();
    // Unwrap params
    const { video_id } = use(params);

    const [statusResponse, setStatusResponse] = useState<any>(null);
    const [pollInterval, setPollInterval] = useState<NodeJS.Timeout | null>(null);

    const [isExtending, setIsExtending] = useState(false);
    const [extendPrompt, setExtendPrompt] = useState("");
    const [isGeneratingExtend, setIsGeneratingExtend] = useState(false);

    const fetchStatus = async () => {
        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_VIDEO_API_URL}/status/${video_id}`);
            if (!res.ok) return;
            const data = await res.json();
            setStatusResponse(data);

            if (data.status === "COMPLETED" || data.status === "FAILED") {
                return true; // stop polling
            }
        } catch (e) {
            console.error(e);
        }
        return false;
    };

    useEffect(() => {
        // Initial fetch
        fetchStatus();

        // Set 8-second polling
        const interval = setInterval(async () => {
            const isDone = await fetchStatus();
            if (isDone) clearInterval(interval);
        }, 8000);

        setPollInterval(interval);

        return () => clearInterval(interval);
    }, [video_id]);

    const handleDownload = () => {
        if (statusResponse?.video_url) {
            window.open(statusResponse.video_url, "_blank");
        }
    };

    const submitExtensionToVideoPlatform = async () => {
        if (!extendPrompt.trim()) return;

        setIsGeneratingExtend(true);

        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_VIDEO_API_URL}/extend`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    video_id: video_id,
                    prompt: extendPrompt
                })
            });

            if (!res.ok) throw new Error(await res.text());

            const json = await res.json();

            const rawContext = localStorage.getItem(`script_context_${video_id}`);
            if (rawContext) {
                const decoded = JSON.parse(rawContext);
                decoded.prompt = extendPrompt;
                localStorage.setItem(`script_context_${json.video_id}`, JSON.stringify(decoded));
            }

            router.push(`/wait/${json.video_id}`);
        } catch (err: any) {
            alert("Error procesando video extendido: " + err.message);
            setIsGeneratingExtend(false);
        }
    };

    if (!statusResponse) {
        return <div style={{ textAlign: 'center', marginTop: 40 }}><p className="animate-pulse">Conectando con el servidor...</p></div>;
    }

    // Calculate Aspect ratio class
    let ratioClass = "ratio-16-9";

    return (
        <div>
            <h1>Estado de Generación</h1>

            {statusResponse.status === "PROCESSING" && (
                <div style={{ textAlign: "center", margin: "40px 0" }}>
                    <div className="animate-pulse" style={{ width: 80, height: 80, borderRadius: '50%', background: 'var(--accent-gradient)', margin: '0 auto 20px', boxShadow: '0 0 30px rgba(255,107,0,0.5)' }}></div>
                    <h2>Renderizando IA...</h2>
                    <p>Nuestra IA está procesando los fotogramas. Consultando de nuevo en 8s.</p>
                </div>
            )}

            {statusResponse.status === "FAILED" && (
                <div style={{ background: "rgba(255,50,50,0.1)", border: "1px solid rgba(255,50,50,0.3)", padding: 20, borderRadius: 12 }}>
                    <h2 style={{ color: "#ff5555" }}>Error en la Generación</h2>
                    <p>{statusResponse.error || "Fallo desconocido"}</p>
                    <button className="btn btn-secondary" onClick={() => router.push("/")}>Volver al Inicio</button>
                </div>
            )}

            {statusResponse.status === "COMPLETED" && !isExtending && (
                <div>
                    <div className={`video-container ${ratioClass}`}>
                        <video src={statusResponse.video_url} controls playsInline loop autoPlay />
                    </div>

                    <div style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
                        <button className="btn btn-secondary" style={{ flex: 1 }} onClick={handleDownload}>
                            Descargar MP4
                        </button>
                        <button className="btn btn-primary" style={{ flex: 1.5 }} onClick={() => setIsExtending(true)}>
                            Extender (+7s)
                        </button>
                    </div>
                </div>
            )}

            {isExtending && (
                <div>
                    <div style={{ textAlign: "center", marginBottom: "16px" }}>
                        <h2>Extender Anuncio (+7s)</h2>
                    </div>

                    <div className="input-group">
                        <label>Nuevo Prompt (Instrucciones para continuación)</label>
                        <textarea 
                             value={extendPrompt} 
                             onChange={(e) => setExtendPrompt(e.target.value)} 
                             required 
                             placeholder="Escribe lo que pasará en los siguientes 7 segundos..." 
                             rows={3} 
                        />
                    </div>

                    <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
                        <button className="btn btn-secondary" disabled={isGeneratingExtend} onClick={() => setIsExtending(false)} style={{ width: 'auto' }}>Cancelar</button>
                        <button className="btn btn-primary" disabled={!extendPrompt.trim() || isGeneratingExtend} onClick={submitExtensionToVideoPlatform}>
                            {isGeneratingExtend ? "Procesando..." : "Renderizar Segunda Parte"}
                        </button>
                    </div>
                </div>
            )}

        </div>
    );
}
