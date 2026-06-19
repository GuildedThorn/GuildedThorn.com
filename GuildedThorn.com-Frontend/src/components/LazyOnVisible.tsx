import { useEffect, useRef, useState, type ReactNode } from "react";

interface LazyOnVisibleProps {
    children: ReactNode;
    /** Shown until the element scrolls into view. */
    fallback?: ReactNode;
    /** Pre-load margin so content is ready just before it enters the viewport. */
    rootMargin?: string;
    className?: string;
}

/**
 * Renders `children` only once the wrapper scrolls within `rootMargin` of the
 * viewport. Pair with a lazy-imported child so its JS chunk is fetched on
 * demand rather than on initial page load.
 */
export default function LazyOnVisible({
    children,
    fallback = null,
    rootMargin = "200px",
    className,
}: LazyOnVisibleProps) {
    const ref = useRef<HTMLDivElement>(null);
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        if (visible) return;
        const el = ref.current;
        if (!el) return;

        const observer = new IntersectionObserver(
            (entries) => {
                if (entries.some((e) => e.isIntersecting)) {
                    setVisible(true);
                    observer.disconnect();
                }
            },
            { rootMargin },
        );

        observer.observe(el);
        return () => observer.disconnect();
    }, [visible, rootMargin]);

    return (
        <div ref={ref} className={className}>
            {visible ? children : fallback}
        </div>
    );
}
