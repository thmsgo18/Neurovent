import { useMemo, useRef } from "react";
import { X } from "lucide-react";
import { usePreferences } from "../context/PreferencesContext";
import {
  getMatchingTopics,
  mergeTopicTokensWithText,
  stripMatchingTopicTokens,
  toggleTopicSuggestion,
} from "../utils/topicSearch";

export default function SearchTopicInput({
  value,
  onChange,
  tags,
  placeholder,
  inputClassName,
  containerClassName = "",
  onKeyDown,
  onTopicRemove,
}) {
  const { t } = usePreferences();
  const inputRef = useRef(null);

  const selectedTopics = useMemo(
    () => getMatchingTopics(tags, value),
    [tags, value],
  );

  const textValue = useMemo(
    () => stripMatchingTopicTokens(tags, value),
    [tags, value],
  );

  const handleInputChange = (event) => {
    onChange(mergeTopicTokensWithText(tags, value, event.target.value));
  };

  const handleRemoveTopic = (topicName) => {
    const nextValue = toggleTopicSuggestion(value, topicName);
    onChange(nextValue);
    onTopicRemove?.(nextValue);
    requestAnimationFrame(() => inputRef.current?.focus());
  };

  return (
    <div
      className={`events-search-input-body ${containerClassName}`.trim()}
      onClick={() => inputRef.current?.focus()}
      role="presentation"
    >
      {selectedTopics.map((tag) => (
        <button
          key={tag.id}
          type="button"
          className="events-search-chip"
          onClick={(event) => {
            event.stopPropagation();
            handleRemoveTopic(tag.name);
          }}
          aria-label={t("Remove topic {{name}}", { name: tag.name })}
        >
          <span className="events-search-chip__label">#{tag.name}</span>
          <span className="events-search-chip__icon" aria-hidden="true">
            <X size={13} />
          </span>
        </button>
      ))}

      <input
        ref={inputRef}
        type="text"
        className={inputClassName}
        placeholder={placeholder}
        value={textValue}
        onChange={handleInputChange}
        onKeyDown={onKeyDown}
      />
    </div>
  );
}
