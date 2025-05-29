import { useRef, useState, useEffect } from "react";

function ThornNet() {
	const containerRef = useRef<HTMLDivElement>(null);
	const innerRef = useRef<HTMLDivElement>(null);
	const [scale, setScale] = useState(1);

	const zoomIn = () => setScale((prev) => Math.min(prev + 0.1, 3));
	const zoomOut = () => setScale((prev) => Math.max(prev - 0.1, 0.5));
	const resetZoom = () => setScale(1);

	// Drag state
	const isDragging = useRef(false);
	const dragStart = useRef({ x: 0, y: 0 });
	const scrollStart = useRef({ left: 0, top: 0 });

	const handleMouseDown = (e: React.MouseEvent) => {
		if (!containerRef.current) return;
		isDragging.current = true;
		dragStart.current = { x: e.clientX, y: e.clientY };
		scrollStart.current = {
			left: containerRef.current.scrollLeft,
			top: containerRef.current.scrollTop,
		};
		containerRef.current.style.cursor = "grabbing";
	};

	useEffect(() => {
		const container = containerRef.current;
		if (!container) return;

		const handleWheel = (e: WheelEvent) => {
			if (e.ctrlKey || e.metaKey || e.altKey || e.shiftKey) {
				e.preventDefault();
				setScale((prev) => {
					const delta = e.deltaY < 0 ? 0.1 : -0.1;
					return Math.min(3, Math.max(0.5, prev + delta));
				});
			}
		};

		container.addEventListener("wheel", handleWheel, { passive: false });

		return () => {
			container.removeEventListener("wheel", handleWheel);
		};
	}, []);

	return (
		<div className="pt-12">
			{/* Zoom Controls */}
			<div className="mb-4 flex justify-center gap-2">
				{[
					{ label: "-", onClick: zoomOut },
					{ label: "Reset", onClick: resetZoom },
					{ label: "+", onClick: zoomIn },
				].map(({ label, onClick }, idx) => (
					<button
						key={idx}
						onClick={onClick}
						className="px-4 py-1.5 rounded-md font-medium border transition
           bg-gray-100 text-gray-800 border-gray-300 hover:bg-gray-200
           dark:bg-gray-700 dark:text-black dark:border-gray-500 dark:hover:bg-gray-600"
					>
						{label}
					</button>
				))}
			</div>

			{/* Zoomable, Draggable Container */}
			<div
				ref={containerRef}
				onMouseDown={handleMouseDown}
				className="overflow-auto border border-gray-300 dark:border-gray-600 rounded h-[80vh] bg-white dark:bg-black"
				style={{ cursor: "grab" }}
			>
				<div
					ref={innerRef}
					style={{
						transform: `scale(${scale})`,
						transformOrigin: "top left",
						width: "fit-content",
					}}
					className="transition-transform"
				>
					<img
						src="/images/network.svg"
						alt="Portfolio Network"
						className="invert-0 dark:invert"
					/>
				</div>
			</div>
		</div>
	);
}

export default ThornNet;
