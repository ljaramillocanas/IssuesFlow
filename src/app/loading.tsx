import LiquidLoader from '@/components/LiquidLoader';

export default function Loading() {
    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-gray-900/80 backdrop-blur-md">
            <LiquidLoader />
        </div>
    );
}
