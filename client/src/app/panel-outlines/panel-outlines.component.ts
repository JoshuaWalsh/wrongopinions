import { Component, ElementRef, Input, OnChanges, OnInit, SimpleChanges, ViewChild } from '@angular/core';
import { PositionedPanel } from '../panel-layout/panel-layout.component';
import { Panel } from '../panel-layout/panel-types/panel-type';
import { SVG, Svg, Element as SVGjsElement } from '@svgdotjs/svg.js';
import { demand } from 'ts-demand';

interface Point {
	horizontalOffset: number;
	verticalOffset: number;
}

@Component({
	selector: 'app-panel-outlines',
	templateUrl: './panel-outlines.component.html',
	styleUrls: ['./panel-outlines.component.scss']
})
export class PanelOutlinesComponent implements OnInit, OnChanges {
	@Input()
	columns!: number;

	@Input()
	columnWidth!: number;

	@Input()
	rows!: number;

	@Input()
	rowHeight!: number;

	@Input()
	margins!: number;

	@Input()
	gaps!: number;

	@Input()
	panelLayout!: Array<PositionedPanel<Panel>>;

	@ViewChild('container')
	container!: ElementRef<HTMLDivElement>;

	svg!: Svg;

	constructor() { }

	ngOnInit(): void {
	}

	ngAfterViewInit() {
		this.svg = SVG().addTo(this.container.nativeElement as unknown as SVGjsElement);
		this.render();
	}

	ngOnChanges(changes: SimpleChanges): void {
		if(this.svg) {
			this.render();
		}
	}

	render() {
		this.svg.clear();
		this.svg.size(this.getColumnX(this.columns + 1) + this.margins * 0.5, this.getRowY(this.rows + 1) + this.margins * 0.5);

		const panelsMap: Array<Array<PositionedPanel<Panel> | null>> = Array(this.columns).fill(null).map(() => Array(this.rows).fill(null));
		for (const panel of this.panelLayout) {
			for(let x = panel.position.startColumn; x < panel.position.endColumn; x++) {
				for(let y = panel.position.startRow; y < panel.position.endRow; y++) {
					panelsMap[x][y] = panel;
				}
			}
		}

		const points: Array<Array<Point>> = Array(this.columns + 1).fill(null).map(() => Array(this.rows + 1).fill(null).map(() => demand<Point>({
			horizontalOffset: 0,
			verticalOffset: 0,
		})));

		for (let i = 1; i < this.columns; i++) {
			let lineStartRow: number | null = null;
			for (let i2 = 0; i2 <= this.rows; i2++) {
				const leftPanel = panelsMap[i - 1][i2];
				const rightPanel = panelsMap[i][i2];
				const interferingPanel = leftPanel && leftPanel === rightPanel;
				if(!interferingPanel && lineStartRow === null) {
					lineStartRow = i2;
				}
				if((interferingPanel || i2 >= this.rows) && lineStartRow !== null) {
					const negativeInterest = (panelsMap[i - 1][lineStartRow]?.size?.interest ?? 0) + (panelsMap[i][i2]?.size?.interest ?? 0) * 0.6;
					const positiveInterest = (panelsMap[i][lineStartRow]?.size?.interest ?? 0) + (panelsMap[i - 1][i2]?.size?.interest ?? 0) * 0.6;
					const interestDifference = positiveInterest - negativeInterest;
					const slantAmount = Math.min(interestDifference * 2, 1) * this.gaps;

					for(let y = lineStartRow; y <= i2; y++) {
						const slantFactor = (y - lineStartRow) / (i2 - lineStartRow) - 0.5;
						points[i][y].horizontalOffset = slantAmount * slantFactor;
					}

					console.log("Line in column", i, "from row", lineStartRow, "to row", i2);
					lineStartRow = null;
				}
			}
		}

		for (const panel of this.panelLayout) {
			const topLeft = points[panel.position.startColumn][panel.position.startRow];
			const topRight = points[panel.position.endColumn][panel.position.startRow];
			const bottomLeft = points[panel.position.startColumn][panel.position.endRow];
			const bottomRight = points[panel.position.endColumn][panel.position.endRow];

			const topY = this.getRowY(panel.position.startRow);
			const bottomY = this.getRowY(panel.position.endRow);
			const leftX = this.getColumnX(panel.position.startColumn);
			const rightX = this.getColumnX(panel.position.endColumn);

			this.svg.polyline([
				[leftX + topLeft.horizontalOffset, topY + topLeft.verticalOffset],
				[leftX + bottomLeft.horizontalOffset, bottomY + bottomLeft.verticalOffset],
			]).stroke({ color: '#000', width: 2, linecap: 'round', linejoin: 'round' });

			this.svg.polyline([
				[rightX + topRight.horizontalOffset, topY + topRight.verticalOffset],
				[rightX + bottomRight.horizontalOffset, bottomY + bottomRight.verticalOffset],
			]).stroke({ color: '#000', width: 2, linecap: 'round', linejoin: 'round' });

			this.svg.polyline([
				[leftX + topLeft.horizontalOffset, topY + topLeft.verticalOffset],
				[rightX + topRight.horizontalOffset, topY + topRight.verticalOffset],
			]).stroke({ color: '#000', width: 2, linecap: 'round', linejoin: 'round' });

			this.svg.polyline([
				[leftX + bottomLeft.horizontalOffset, bottomY + bottomLeft.verticalOffset],
				[rightX + bottomRight.horizontalOffset, bottomY + bottomRight.verticalOffset],
			]).stroke({ color: '#000', width: 2, linecap: 'round', linejoin: 'round' });
		}
	}

	private getColumnX(column: number) {
		if(column <= 0) {
			return this.margins * 0.5;
		}

		if(column <= this.columns) {
			return this.margins + this.columnWidth * column + this.gaps * (column - 1);
		}
		
		return this.margins * 1.5 + this.columnWidth * this.columns + this.gaps * (this.columns - 1);
	}

	private getRowY(row: number) {
		if(row <= 0) {
			return this.margins * 0.5;
		}

		if(row <= this.rows) {
			return this.margins + this.rowHeight * row + this.gaps * (row - 1);
		}
		
		return this.margins * 1.5 + this.rowHeight * this.rows + this.gaps * (this.rows - 1);
	}
}
