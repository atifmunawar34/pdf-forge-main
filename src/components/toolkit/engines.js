import TextTool from './TextTool';
import CalcTool from './CalcTool';
import ConvertTool from './ConvertTool';
import GenerateTool from './GenerateTool';
import QrTool from './QrTool';
import ColorTool from './ColorTool';
import ImageTool from './ImageTool';
import FileTool from './FileTool';
import SeoTool from './SeoTool';
import AiTool from './AiTool';
import SpeechTool from './SpeechTool';

export const ENGINES = {
  text: TextTool, calc: CalcTool, convert: ConvertTool, generate: GenerateTool,
  qr: QrTool, color: ColorTool, image: ImageTool, file: FileTool,
  seo: SeoTool, ai: AiTool, speech: SpeechTool,
};
