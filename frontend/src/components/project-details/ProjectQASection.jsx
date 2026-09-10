import Alert from '../Alert';
import Button from '../Button';
import Card from '../Card';

const ProjectQASection = ({
  question,
  answer,
  answerQuestion,
  sources,
  loading,
  error,
  onQuestionChange,
  onSubmit,
}) => (
  <Card id="project-qa" className="project-qa-section workspace-section" aria-labelledby="project-qa-heading">
    <div className="documents-section__header project-qa-section__header">
      <div>
        <p className="section-eyebrow">Project Q&amp;A</p>
        <h2 id="project-qa-heading">Ask project documents</h2>
        <p>Ask questions grounded in this project's uploaded knowledge. Review AI answers before acting.</p>
      </div>
    </div>
    <form className="project-qa-form" onSubmit={onSubmit}>
      <div className="project-qa-form__header">
        <h3>Ask a question</h3>
        <p id="project-question-help">Relevant document excerpts are retrieved before an answer is generated.</p>
      </div>
      <div className="project-qa-field">
        <label htmlFor="project-question">Question</label>
        <textarea
          id="project-question"
          value={question}
          onChange={onQuestionChange}
          placeholder="Ask a question about the project documents"
          aria-describedby="project-question-help"
          rows={3}
        />
      </div>
      {error && <Alert>{error}</Alert>}
      <div className="project-qa-form__actions">
        <Button type="submit" disabled={loading}>{loading ? 'Asking...' : 'Ask AI'}</Button>
      </div>
    </form>
    {loading && (
      <p className="project-qa-loading" role="status">
        Searching project documents and generating an answer...
      </p>
    )}
    {answer && (
      <div className="project-qa-answer" aria-live="polite">
        <p className="section-eyebrow">AI answer</p>
        {answerQuestion && <p className="project-qa-answer__question">Answer to “{answerQuestion}”</p>}
        {(loading || error) && question.trim() !== answerQuestion && (
          <p className="project-qa-answer__context">
            The answer below is from the previous successful question.
          </p>
        )}
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
                <div>
                  <span className="project-qa-source__identifier">{source.sourceId || `Source ${index + 1}`}</span>
                  {source.title && <strong>{source.title}</strong>}
                </div>
                {typeof source.score === 'number' && (
                  <span className="project-qa-source-score">Relevance {(source.score * 100).toFixed(1)}%</span>
                )}
              </div>
              {(source.originalFilename || source.pageNumber || source.section) && (
                <p className="project-qa-source__location">
                  {[source.originalFilename, source.pageNumber ? `Page ${source.pageNumber}` : '', source.section]
                    .filter(Boolean).join(' · ')}
                </p>
              )}
              {(source.excerpt || source.content) && <p className="project-qa-source-content">{source.excerpt || source.content}</p>}
            </li>
          ))}
        </ul>
      </div>
    )}
  </Card>
);

export default ProjectQASection;
