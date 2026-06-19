import { JSX } from "react";

interface ITableProps {
	headers: string[];
	data: Array<Array<string | JSX.Element>>; // Accepting either strings or JSX elements
}

function Table({ headers, data }: ITableProps) {
	return (
		<div className="w-full overflow-x-auto rounded-xl border border-border">
			<table className="w-full table-auto border-collapse text-left">
				<thead className="bg-muted">
					<tr>
						{headers.map((header, index) => (
							<th
								key={index}
								className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground"
							>
								{header}
							</th>
						))}
					</tr>
				</thead>
				<tbody className="divide-y divide-border">
					{data.map((row, rowIndex) => (
						<tr
							key={rowIndex}
							className="transition-colors hover:bg-muted/50"
						>
							{row.map((cell, cellIndex) => (
								<td key={cellIndex} className="px-4 py-3 text-sm">
									{cell}
								</td>
							))}
						</tr>
					))}
				</tbody>
			</table>
		</div>
	);
}

export default Table;
