import PdfUploader from "@/components/PdfUploader";

export const metadata = { title: 'OrdinalScale Dashboard' }

export default function DashboardPage() {
    return (
        <main className="py-10 flex justify-center">
            <PdfUploader />
        </main>
    )
}
