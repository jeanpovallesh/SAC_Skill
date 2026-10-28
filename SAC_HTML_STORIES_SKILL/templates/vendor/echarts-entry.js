import * as echarts from 'echarts/core';
import { PieChart, BarChart, ScatterChart, LineChart } from 'echarts/charts';
import { TooltipComponent, LegendComponent, GridComponent, MarkLineComponent, AriaComponent, GraphicComponent } from 'echarts/components';
import { SVGRenderer } from 'echarts/renderers';
echarts.use([PieChart, BarChart, ScatterChart, LineChart, TooltipComponent, LegendComponent, GridComponent, MarkLineComponent, AriaComponent, GraphicComponent, SVGRenderer]);
export default echarts;
