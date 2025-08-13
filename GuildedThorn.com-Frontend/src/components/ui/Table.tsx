import { JSX } from "react";

interface ITableProps {
	headers: string[];
	data: Array<Array<string | JSX.Element>>; // Accepting either strings or JSX elements
}

function Table({ headers, data }: ITableProps) {
	return (
		<div className="w-full overflow-x-auto rounded-2xl">
			{/* Wrapper div to make the table horizontally scrollable on small screens */}
			<table className="w-full table-auto border-collapse border border-gray-300 dark:border-gray-700">
				<thead className="bg-gray-100 dark:bg-gray-700">
					<tr>
						{headers.map((header, index) => (
							<th
								key={index}
								className="text-left px-4 py-2 border border-gray-300 dark:border-gray-700 text-sm font-medium"
							>
								{header}
							</th>
						))}
					</tr>
				</thead>
				<tbody>
					{data.map((row, rowIndex) => (
						<tr
							key={rowIndex}
							className="odd:bg-white even:bg-gray-50 dark:odd:bg-gray-800 dark:even:bg-gray-900"
						>
							{row.map((cell, cellIndex) => (
								<td
									key={cellIndex}
									className="px-4 py-2 border border-gray-300 dark:border-gray-700 text-sm"
								>
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
