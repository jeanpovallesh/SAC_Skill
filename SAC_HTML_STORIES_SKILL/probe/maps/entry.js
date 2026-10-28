import * as echarts from 'echarts/core';
import { PieChart, BarChart, ScatterChart, LineChart, MapChart } from 'echarts/charts';
import { TooltipComponent, LegendComponent, GridComponent, MarkLineComponent, AriaComponent, GraphicComponent, GeoComponent, VisualMapComponent } from 'echarts/components';
import { SVGRenderer } from 'echarts/renderers';
echarts.use([PieChart, BarChart, ScatterChart, LineChart, MapChart, TooltipComponent, LegendComponent, GridComponent, MarkLineComponent, AriaComponent, GraphicComponent, GeoComponent, VisualMapComponent, SVGRenderer]);
export default echarts;
