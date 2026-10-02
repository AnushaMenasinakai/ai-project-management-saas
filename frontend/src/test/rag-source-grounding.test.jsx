import { render, screen } from '@testing-library/react';
import { describe, expect, test, vi } from 'vitest';
import ProjectQASection from '../components/project-details/ProjectQASection';

const renderSection = (sources, answer = "The release is phased. [S1]") => render(<ProjectQASection
  question="What is the release plan?"
  answer={answer}
  answerQuestion="What is the release plan?"
  sources={sources}
  loading={false}
  error=""
  onQuestionChange={vi.fn()}
  onSubmit={vi.fn()}
/>);

describe('ground source display', () => {
  test('renders grounded file metadata, location, excerpt, and relevance', () => {
    renderSection([{
      sourceId: 'S1', chunkId: 'chunk-1', title: 'Release Plan',
      originalFilename: 'release-plan.pdf', pageNumber: 3, section: 'Milestones',
      score: 0.876, excerpt: 'The release begins with a controlled pilot.',
    }]);
    expect(screen.getByText('S1')).toBeInTheDocument();
    expect(screen.getByText('Release Plan')).toBeInTheDocument();
    expect(screen.getByText('release-plan.pdf · Page 3 · Milestones')).toBeInTheDocument();
    expect(screen.getByText('The release begins with a controlled pilot.')).toBeInTheDocument();
    expect(screen.getByText('Relevance 87.6%')).toBeInTheDocument();
  });

  test('keeps legacy sources without new metadata readable', () => {
    renderSection([{ chunkId: 'legacy', title: 'Notes', content: 'Legacy excerpt.' }]);
    expect(screen.getByText('Source 1')).toBeInTheDocument();
    expect(screen.getByText('Notes')).toBeInTheDocument();
    expect(screen.getByText('Legacy excerpt.')).toBeInTheDocument();
    expect(screen.queryByText(/undefined/i)).not.toBeInTheDocument();
  });
});


describe('Markdown answer rendering', () => {
  test('renders bold labels and lists while preserving citation text', () => {
    const { container } = renderSection([], '**Backend Technologies:**\n* **Runtime:** Node.js [S1, S2]\n* **Web Framework:** Express.js [S1, S2]');
    const answer = container.querySelector('.project-qa-answer__markdown');
    expect(answer.querySelector('strong')).toHaveTextContent('Backend Technologies:');
    expect(answer.querySelectorAll('ul > li')).toHaveLength(2);
    expect(answer.querySelector('li').textContent).toBe('Runtime: Node.js [S1, S2]');
    expect(answer.textContent).not.toContain('**');
  });

  test('renders headings, paragraphs, ordered lists and individual source labels', () => {
    const { container } = renderSection([], '## Next steps\n\nReview the plan. [S1]\n\n1. Build\n2. Test [S2]');
    const answer = container.querySelector('.project-qa-answer__markdown');
    expect(answer.querySelector('h2')).toHaveTextContent('Next steps');
    expect(answer.querySelector('p').textContent).toBe('Review the plan. [S1]');
    expect(answer.querySelectorAll('ol > li')).toHaveLength(2);
    expect(answer.querySelectorAll('li')[1].textContent).toBe('Test [S2]');
  });

  test('does not interpret raw HTML or allow executable links', () => {
    const { container } = renderSection([], '<img src=x onerror="alert(1)">\n\n[unsafe](javascript:alert%281%29)');
    const answer = container.querySelector('.project-qa-answer__markdown');
    expect(answer.querySelector('img')).toBeNull();
    expect(answer.querySelector('a')).not.toHaveAttribute('href', expect.stringMatching(/^javascript:/));
  });
});
