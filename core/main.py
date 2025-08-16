from typer import Typer
from typer import Argument
from typing import Annotated
import rootutils
rootutils.setup_root(__file__, indicator=".project-root", pythonpath=True)

app = Typer(name="GraphFusionVulDetect")

@app.command("finetune")
def run_pipeline_finetuning(mode:  Annotated[str, Argument(help="mode for run pipeline of the finetuning")]="train"):
    try:
        from core.finetune_llm.pipeline import PipelineFinetuning
    except ImportError:
        raise ImportError("PipelineFinetuning module not found. Please ensure it is installed correctly.")
    PipelineFinetuning.runtime(mode=mode)

@app.command("gfd")
def run_pipeline_gfd(mode:  Annotated[str, Argument(help="mode for run pipeline of the GFD")]="train"):
    try:
        from core.GFD.pipeline import PipelineGFD
    except ImportError:
        raise ImportError("PipelineGFD module not found. Please ensure it is installed correctly.")
    pipeline = PipelineGFD()
    pipeline.runtime(mode=mode)

if __name__ == "__main__":
    app()