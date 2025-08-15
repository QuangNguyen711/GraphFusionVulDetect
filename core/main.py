from typer import Typer
import rootutils
rootutils.setup_root(__file__, indicator=".project-root", pythonpath=True)

app = Typer(name="GraphFusionVulDetect")

@app.command("finetune")
def run_pipeline_finetuning():
    try:
        from core.finetune_llm.pipeline import PipelineFinetuning
    except ImportError:
        raise ImportError("PipelineFinetuning module not found. Please ensure it is installed correctly.")
    PipelineFinetuning.runtime()

@app.command("gfd")
def run_pipeline_gfd():
    try:
        from core.GFD.pipeline import PipelineGFD
    except ImportError:
        raise ImportError("PipelineGFD module not found. Please ensure it is installed correctly.")
    pipeline = PipelineGFD()
    pipeline.runtime()

if __name__ == "__main__":
    app()