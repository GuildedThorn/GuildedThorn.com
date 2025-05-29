function Card({
	title,
	children,
}: {
	title: string;
	children: React.ReactNode[];
}) {
	return (
		<section className="border dark:border-gray-600 rounded-lg p-4 bg-white dark:bg-gray-800">
			<h1 className="font-[Caveat,_cursive] text-2xl mb-2">{title}</h1>
			{children}
		</section>
	);
}

export default Card;
