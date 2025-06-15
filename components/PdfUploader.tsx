"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { createWorker } from "tesseract.js";
import { v4 as uuidv4 } from "uuid";
import { useRouter } from "next/navigation";
import type { PDFDocumentLoadingTask } from 'pdfjs-dist';

interface PDFJSModule {
    getDocument: (options: { data: ArrayBuffer }) => PDFDocumentLoadingTask;
    GlobalWorkerOptions: {
        workerSrc: string;
    };
}

export default function PdfUploader() {
    const [file, setFile] = useState<File | null>(null);
    const [status, setStatus] = useState<'idle' | 'uploading' | 'ocr' | 'saving'>("idle");
    const router = useRouter();
    const [pdfjsLib, setPdfjsLib] = useState<PDFJSModule | null>(null);

    useEffect(() => {
        // Dynamically import PDF.js only on client side
        import('pdfjs-dist').then((module) => {
            const pdfjs = module as unknown as PDFJSModule;
            pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker/pdf.worker.min.js';
            setPdfjsLib(pdfjs);
        });
    }, []);

    async function convertPdfToImage(pdfFile: File): Promise<string> {
        if (!pdfjsLib) {
            throw new Error('PDF.js not initialized');
        }

        const arrayBuffer = await pdfFile.arrayBuffer();
        const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
        const pdf = await loadingTask.promise;
        const page = await pdf.getPage(1); // Get first page
        
        const viewport = page.getViewport({ scale: 2.0 });
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        
        canvas.height = viewport.height;
        canvas.width = viewport.width;
        
        await page.render({
            canvasContext: context!,
            viewport: viewport
        }).promise;
        
        return canvas.toDataURL('image/png');
    }

    async function handleSubmit() {
        if (!file) return;
        setStatus('uploading');

        try {
            // 1. Upload raw PDF to Supabase Storage
            const fileId = uuidv4();
            const storagePath = `${fileId}/${file.name}`;
            
            const { error: uploadErr } = await supabase
                .storage
                .from('contracts')
                .upload(storagePath, file, {
                    cacheControl: '3600',
                    upsert: false,
                    contentType: 'application/pdf'
                });

            if (uploadErr) {
                console.error('Upload error:', uploadErr);
                if (uploadErr.message.includes('duplicate')) {
                    throw new Error('A file with this name already exists');
                } else if (uploadErr.message.includes('size')) {
                    throw new Error('File size exceeds the limit');
                } else if (uploadErr.message.includes('JWT')) {
                    throw new Error('Authentication error: Please check your Supabase API key');
                } else if (uploadErr.message.includes('row-level security policy')) {
                    throw new Error('Permission denied: Please check your storage bucket policies');
                } else {
                    throw new Error('Upload failed: ' + uploadErr.message);
                }
            }

            console.log('File uploaded successfully');

            // 2. Convert PDF to image
            setStatus('ocr');
            const imageDataUrl = await convertPdfToImage(file);
            
            // 3. Perform OCR on the image
            const worker = await createWorker();
            await worker.reinitialize('eng');
            
            const { data: { text } } = await worker.recognize(imageDataUrl);
            await worker.terminate();

            // 4. Persist OCR text to contracts table
            setStatus('saving');
            const { error: insertErr } = await supabase.from('contracts').insert({
                id: fileId,
                file_name: file.name,
                storage_path: storagePath,
                ocr_text: text, 
            });
            if (insertErr) throw insertErr;

            // 5. Done - route to dashboard detail page
            router.push(`/dashboard/${fileId}`);
        } catch (error) {
            console.error('Error handling file upload:', error);
            setStatus('idle');
        }
    }

    return (
        <div className="mx-auto max-w-md border rounded-xl p-6 space-y-4">
            <input 
                type="file"
                accept="application/pdf"
                onChange={e => setFile(e.target.files?.[0] ?? null)}
            />
            <button 
                onClick={handleSubmit}
                disabled={!file || status !== 'idle' || !pdfjsLib}
                className="w-full rounded bg-blue-600 px-4 py-2 text-gray-50 disabled:opacity-50"
            >
                {!pdfjsLib && 'Loading...'}
                {pdfjsLib && status === 'idle' && 'Upload PDF'}
                {status === 'uploading' && 'Uploading...'}
                {status === 'ocr' && 'Processing...'}
                {status === 'saving' && 'Saving...'}
            </button>
        </div>
    );
}