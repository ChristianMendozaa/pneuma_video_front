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
    const [extensionScripts, setExtensionScripts] = useState<any[]>([]);
    const [selectedExtScriptId, setSelectedExtScriptId] = useState<number | null>(null);
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

    const handleRequestExtensionScripts = async () => {
        const rawContext = localStorage.getItem(`script_context_${video_id}`);
        if (!rawContext) {
            alert("No se encontró el contexto del anuncio para extenderlo. Genera uno nuevo.");
            return;
        }

        setIsExtending(true);
        try {
            const context = JSON.parse(rawContext);
            const form = new FormData();
            form.append("data", JSON.stringify({
                product_name: context.product_name,
                product_description: context.product_description,
                previous_script: context.previous_script,
                technical_settings: { aspect_ratio: context.aspect_ratio },
                preferences: context.preferences
            }));

            const res = await fetch(`${process.env.NEXT_PUBLIC_SCRIPT_API_URL}/extend-scripts`, {
                method: "POST",
                body: form
            });

            if (!res.ok) throw new Error(await res.text());

            const json = await res.json();
            setExtensionScripts(json.opciones);
        } catch (err: any) {
            alert("Error pidiendo extensión: " + err.message);
            setIsExtending(false);
        }
    };

    const submitExtensionToVideoPlatform = async () => {
        if (selectedExtScriptId === null) return;
        const selectedScript = extensionScripts.find(s => s.id === selectedExtScriptId);
        if (!selectedScript) return;

        setIsGeneratingExtend(true);

        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_VIDEO_API_URL}/extend`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    video_id: video_id,
                    prompt_veo_visual: selectedScript.prompt_veo_visual,
                    prompt_veo_audio: selectedScript.prompt_veo_audio,
                    script_text: selectedScript.texto_locucion
                })
            });

            if (!res.ok) throw new Error(await res.text());

            const json = await res.json();

            // Pasar el contexto de esta extensión por si lo llegasen a extender denuevo en un futuro (aunque Veo 3.1 no suele encadenar 3, pero por consistencia)
            const rawContext = localStorage.getItem(`script_context_${video_id}`);
            if (rawContext) {
                const decoded = JSON.parse(rawContext);
                decoded.previous_script = selectedScript;
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
                        <button className="btn btn-primary" style={{ flex: 1.5 }} onClick={handleRequestExtensionScripts}>
                            Extender (+7s)
                        </button>
                    </div>
                </div>
            )}

            {isExtending && (
                <div>
                    <div style={{ textAlign: "center" }}>
                        <h2>Generando Guiones de Extensión...</h2>
                    </div>

                    {extensionScripts.length > 0 && (
                        <div>
                            <p>Elige cómo continuará la segunda parte de tu anuncio (7 segundos).</p>
                            {extensionScripts.map(script => (
                                <div
                                    key={script.id}
                                    className={`glass-card selectable ${selectedExtScriptId === script.id ? "selected" : ""}`}
                                    onClick={() => setSelectedExtScriptId(script.id)}
                                >
                                    <p style={{ color: "white", fontStyle: "italic", marginBottom: 0 }}>&quot;{script.texto_locucion}&quot;</p>
                                </div>
                            ))}

                            <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
                                <button className="btn btn-secondary" disabled={isGeneratingExtend} onClick={() => setIsExtending(false)} style={{ width: 'auto' }}>Cancelar</button>
                                <button className="btn btn-primary" disabled={selectedExtScriptId === null || isGeneratingExtend} onClick={submitExtensionToVideoPlatform}>
                                    {isGeneratingExtend ? "Procesando..." : "Renderizar Segunda Parte"}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}

        </div>
    );
}
