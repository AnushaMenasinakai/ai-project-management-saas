import Alert from '../Alert';
import Button from '../Button';

const AITaskGenerator = ({
  generatingTasks,
  generateTasksError,
  generateTasksSuccess,
  onGenerate,
  onClose,
}) => (
  <section className="ai-task-generation" aria-labelledby="ai-task-generation-heading">
    <div className="ai-task-generation__header">
      <div>
        <p className="section-eyebrow">Secondary creation workflow</p>
        <h3 id="ai-task-generation-heading">Generate tasks with AI</h3>
        <p className="ai-task-generation__description">
          Generate a validated set of tasks from this project's name and description.
        </p>
      </div>
      <Button type="button" variant="secondary" disabled={generatingTasks} onClick={onClose}>Close</Button>
    </div>
    <Button type="button" onClick={onGenerate} disabled={generatingTasks}>
      {generatingTasks ? 'Generating Tasks...' : 'Generate Tasks with AI'}
    </Button>
    <p className="ai-task-generation__note">
      Running AI generation again will create another set of tasks.
    </p>
    {generatingTasks && (
      <p className="ai-task-generation__status" role="status">
        AI is generating and organizing tasks for this project...
      </p>
    )}
    {generateTasksError && <Alert>{generateTasksError}</Alert>}
    {generateTasksSuccess && (
      <p className="ai-task-generation__success alert alert--success" role="status">
        {generateTasksSuccess}
      </p>
    )}
  </section>
);

export default AITaskGenerator;
