import {observer} from "mobx-react";
import {Modal} from "@/components/properties/Common.jsx";
import {LoginBox} from "@/components/login/index.jsx";
import {mediaPropertyStore, rootStore} from "@/stores/index.js";
import {useEffect, useState} from "react";
import {Select, TextInput} from "@mantine/core";
import ImageIcon from "@/components/common/ImageIcon.jsx";
import {Loader} from "@/components/common/Loaders.jsx";

import SearchIcon from "@/assets/icons/search.svg";
import CheckmarkIcon from "@/assets/icons/check-circle.svg";

const UserQuestionnaireModal = observer(() => {
  const [questionIndex, setQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [filter, setFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitted, setSubmitted] = useState(false);

  const mediaProperty = mediaPropertyStore.MediaProperty({mediaPropertySlugOrId: rootStore.routeParams.mediaPropertySlugOrId});
  const questionnaireInfo = mediaProperty?.metadata.login?.user_questionnaire || {};

  useEffect(() => {
    setFilter("");
  }, [questionIndex]);

  useEffect(() => {
    setQuestionIndex(0);
  }, [rootStore.showUserQuestionnaire]);

  useEffect(() => {
    if(!questionnaireInfo || !questionnaireInfo.enable || !rootStore.loggedIn) { return; }

    setLoading(true);

    rootStore.GetUserInfo()
      .then(info => {
        let initialAnswers = {};
        questionnaireInfo.questions.map(question => {
          if(!question.key) { return; }

          if(question.type === "multiselect") {
            initialAnswers[question.key] = (info[question.key] || "").split(",");
          } else {
            initialAnswers[question.key] = info[question.key] || "";
          }
        });

        setAnswers(initialAnswers);
        setLoading(false);

        if(!submitted && info[`${rootStore.currentPropertyId}-version`] !== (questionnaireInfo.version_key || "default")) {
          // User has not yet answered questions
          rootStore.SetShowUserQuestionnaire(true);
        }
      })
      .catch(error => {
        rootStore.Log(error, true);
        setAnswers({});
        setLoading(false);
      });
  }, [rootStore.loggedIn, rootStore.showUserQuestionnaire, questionnaireInfo?.enable, rootStore.currentPropertyId]);

  if(!rootStore.loggedIn || !rootStore.showUserQuestionnaire || !questionnaireInfo.enable) { return null; }

  const Submit = async () => {
    rootStore.SetShowUserQuestionnaire(false);

    setSubmitted(true);

    let submittingAnswers = {};
    questionnaireInfo.questions.map(question => {
      if(!question.key) { return; }

      if(question.type === "multiselect") {
        submittingAnswers[question.key] = (answers[question.key] || []).filter(answer => answer).join(",");
      } else {
        submittingAnswers[question.key] = answers[question.key] || "";
      }
    });

    // Record questionnaire version
    submittingAnswers[`${rootStore.currentPropertyId}-version`] = questionnaireInfo.version_key || "default";

    await rootStore.SetUserInfo({data: submittingAnswers});
  };

  const currentQuestion = questionnaireInfo.questions?.[questionIndex];

  let content;
  if(loading) {
    content = <Loader className="user-questionnaire__loader" />;
  } else if(currentQuestion) {
    // Question
    content = (
      <>
        {
          !currentQuestion.title ? null :
            <div className={"user-questionnaire__title"}>
              {currentQuestion.title}
            </div>
        }
        {
          !currentQuestion.description ? null :
            <div className={"user-questionnaire__description"}>
              {currentQuestion.description}
            </div>
        }
        <div className="user-questionnaire__form">
          {
            currentQuestion.type !== "select" ? null :
              <Select
                value={answers[currentQuestion.key] || ""}
                onChange={value => setAnswers({...answers, [currentQuestion.key]: value})}
                data={[
                  {label: "Select an Option", value: ""},
                  ...currentQuestion.options.map(option => ({label: option, value: option}))
                ]}
              />
          }
          {
            currentQuestion.type !== "multiselect" ? null :
              <div className="user-questionnaire__multiselect">
                {
                  currentQuestion.options.length < 10 ? null :

                    <TextInput
                      leftSection={<ImageIcon className="user-questionnaire__filter-icon" icon={SearchIcon} />}
                      value={filter}
                      placeholder="Search"
                      leftContent
                      onChange={event => setFilter(event.target.value)}
                    />
                }
                <div className="user-questionnaire__multiselect-options">
                  {
                    currentQuestion.options
                      .filter(option => !filter || option.toLowerCase().includes(filter.toLowerCase()))
                      .map(option => {
                        const checked = !!answers[currentQuestion.key]?.find(item => item === option);
                        const Toggle = () => setAnswers({
                          ...answers,
                          [currentQuestion.key]: checked ?
                            answers[currentQuestion.key].filter(item => item !== option) :
                            [...(answers[currentQuestion.key] || []), option]
                        });

                        return (
                          <div key={`option-${option}`} className="user-questionnaire__multiselect-option">
                            <input
                              type="checkbox"
                              name={option}
                              title={option}
                              checked={checked}
                              onChange={Toggle}
                            />
                            <label htmlFor={option} onClick={Toggle}>
                              {option}
                            </label>
                          </div>
                        );
                      })
                  }
                </div>
              </div>
          }
        </div>
      </>
    );
  } else {
    // Confirmation screen
    content = (
      <>
        <div className="user-questionnaire__checkmark-container">
          <ImageIcon className="user-questionnaire__checkmark" icon={CheckmarkIcon} />
        </div>
        {
          !questionnaireInfo.confirmation_title ? null :
            <div className={"user-questionnaire__title"}>
              {questionnaireInfo.confirmation_title}
            </div>
        }
        {
          !questionnaireInfo.confirmation_description ? null :
            <div className={"user-questionnaire__description"}>
              {questionnaireInfo.confirmation_description}
            </div>
        }
      </>
    );
  }

  return (
    <Modal
      opened
      centered
      size="auto"
      noBackground
      withCloseButton={false}
    >
      <LoginBox className="user-questionnaire">
        <div key={`content-${questionIndex}`} className={"user-questionnaire__content"}>
          { content }
        </div>
        <div key={`actions-${questionIndex}`} className={"user-questionnaire__actions"}>
          {
            !currentQuestion ?
              <button
                className="login-page__button login-page__button--primary user-questionnaire__button"
                onClick={() => Submit()}
              >
                {rootStore.l10n.login.user_questionnaire.actions.done}
              </button> :
              <button
                disabled={currentQuestion?.required && !answers[currentQuestion.key]}
                className="login-page__button login-page__button--primary user-questionnaire__button"
                onClick={() => setQuestionIndex(questionIndex + 1)}
              >
                {rootStore.l10n.login.user_questionnaire.actions.continue}
              </button>
          }
          {
            !currentQuestion || currentQuestion.required ? null :
              <button
                className="login-page__button login-page__button--secondary user-questionnaire__button"
                onClick={() => {
                  setAnswers({...answers, [currentQuestion.key]: undefined});
                  setQuestionIndex(questionIndex + 1);
                }}
              >
                { rootStore.l10n.login.user_questionnaire.actions.skip }
              </button>
          }
          {
            !currentQuestion || questionIndex === 0 ? null :
              <button
                className="login-page__button login-page__button--secondary user-questionnaire__button"
                onClick={() => setQuestionIndex(questionIndex - 1)}
              >
                { rootStore.l10n.login.user_questionnaire.actions.back }
              </button>
          }
        </div>
      </LoginBox>
    </Modal>
  );
});

export default UserQuestionnaireModal;
