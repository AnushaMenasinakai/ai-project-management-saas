import Alert from '../Alert';
import Button from '../Button';
import Card from '../Card';

const ProjectQASection = ({
  question,
  answer,
  sources,
  loading,
  error,
  onQuestionChange,
  onSubmit,
}) => (
  <Card id="project-qa" className="project-qa-section workspace-section" aria-labelledby="project-qa-heading">
    <div className="documents-section__header">
      <h2 id="project-qa-heading">Project Q&amp;A</h2>
      <p>Ask questions using knowledge from this project's documents.</p>
    </div>
    <form className="project-qa-form" onSubmit={onSubmit}>
      <div className="project-qa-field">
        <label htmlFor="project-question">Ask a question</label>
        <textarea
          id="project-question"
          value={question}
          onChange={onQuestionChange}
          placeholder="Ask a question about the project documents"
          rows={3}
        />
      </div>
      {error && <Alert>{error}</Alert>}
      <Button type="submit" disabled={loading}>{loading ? 'Asking...' : 'Ask AI'}</Button>
    </form>
    {loading && (
      <p className="project-qa-loading" role="status">
        Searching project documents and generating an answer...
      </p>
    )}
    {answer && (
      <div className="project-qa-answer" aria-live="polite">
        <p className="section-eyebrow">AI answer</p>
        <p>{answer}</p>
      </div>
    )}
    {sources.length > 0 && (
      <div className="project-qa-sources">
        <div className="project-qa-sources__header">
          <h3>Sources</h3>
          <span>{sources.length} {sources.length === 1 ? 'source' : 'sources'}</span>
        </div>
        <ul>
          {sources.map((source, index) => (
            <li key={source.chunkId || index}>
              <div className="project-qa-source__header">
                {source.title && <strong>{source.title}</strong>}
                {typeof source.score === 'number' && (
                  <span className="project-qa-source-score">Relevance {(source.score * 100).toFixed(1)}%</span>
                )}
              </div>
              {source.content && <p className="project-qa-source-content">{source.content}</p>}
            </li>
          ))}
        </ul>
      </div>
    )}
  </Card>
);

export default ProjectQASection;
