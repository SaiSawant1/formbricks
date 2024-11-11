"use client";

import { createActionClassAction } from "@/app/(app)/(survey-editor)/environments/[environmentId]/surveys/[surveyId]/edit/actions";
import { isValidCssSelector } from "@/app/lib/actionClass/actionClass";
import { getFormattedErrorMessage } from "@/lib/utils/helper";
import { Code2Icon, MousePointerClickIcon, SparklesIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { convertDateTimeStringShort } from "@formbricks/lib/time";
import { capitalizeFirstLetter } from "@formbricks/lib/utils/strings";
import { TActionClass, TActionClassInput, TActionClassInputCode } from "@formbricks/types/action-classes";
import { TEnvironment } from "@formbricks/types/environment";
import { Button } from "@formbricks/ui/components/Button";
import { ErrorComponent } from "@formbricks/ui/components/ErrorComponent";
import { Label } from "@formbricks/ui/components/Label";
import { LoadingSpinner } from "@formbricks/ui/components/LoadingSpinner";
import { getActiveInactiveSurveysAction } from "../actions";

interface ActivityTabProps {
  actionClass: TActionClass;
  environmentId: string;
  environment: TEnvironment;
  toCopyActionClasses: TActionClass[];
  toCopyEnvironment: TEnvironment;
  isViewer: boolean;
}

export const ActionActivityTab = ({
  actionClass,
  toCopyActionClasses,
  toCopyEnvironment,
  environmentId,
  environment,
  isViewer,
}: ActivityTabProps) => {
  const t = useTranslations();
  const [activeSurveys, setActiveSurveys] = useState<string[] | undefined>();
  const [inactiveSurveys, setInactiveSurveys] = useState<string[] | undefined>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  useEffect(() => {
    setLoading(true);

    const updateState = async () => {
      setLoading(true);
      const getActiveInactiveSurveysResponse = await getActiveInactiveSurveysAction({
        actionClassId: actionClass.id,
      });
      if (getActiveInactiveSurveysResponse?.data) {
        setActiveSurveys(getActiveInactiveSurveysResponse.data.activeSurveys);
        setInactiveSurveys(getActiveInactiveSurveysResponse.data.inactiveSurveys);
      } else {
        const errorMessage = getFormattedErrorMessage(getActiveInactiveSurveysResponse);
        setError(new Error(errorMessage));
      }
      setLoading(false);
    };

    updateState();
  }, [actionClass.id, environmentId]);

  const actionClassNames = useMemo(
    () => toCopyActionClasses.map((actionClass) => actionClass.name),
    [toCopyActionClasses]
  );

  const actionClassKeys = useMemo(() => {
    const codeActionClasses: TActionClassInputCode[] = toCopyActionClasses.filter(
      (actionClass) => actionClass.type === "code"
    ) as TActionClassInputCode[];

    return codeActionClasses.map((actionClass) => actionClass.key);
  }, [toCopyActionClasses]);

  const copyAction = async (data: TActionClassInput) => {
    const { type } = data;
    let copyName = data.name + " (copy)";
    try {
      if (isViewer) {
        throw new Error(t("common.you_are_not_authorised_to_perform_this_action"));
      }

      if (copyName && actionClassNames.includes(copyName)) {
        while (actionClassNames.includes(copyName)) {
          copyName += " (copy)";
        }
      }

      if (type === "code" && data.key && actionClassKeys.includes(data.key)) {
        throw new Error(t("environments.actions.action_with_key_already_exists", { key: data.key }));
      }

      if (
        data.type === "noCode" &&
        data.noCodeConfig?.type === "click" &&
        data.noCodeConfig.elementSelector.cssSelector &&
        !isValidCssSelector(data.noCodeConfig.elementSelector.cssSelector)
      ) {
        throw new Error("Invalid CSS Selector");
      }

      let updatedAction = {};

      if (type === "noCode") {
        updatedAction = {
          name: copyName.trim(),
          description: data.description,
          environmentId: toCopyEnvironment.id,
          type: "noCode",
          noCodeConfig: {
            ...data.noCodeConfig,
            ...(data.type === "noCode" &&
              data.noCodeConfig?.type === "click" && {
                elementSelector: {
                  cssSelector: data.noCodeConfig.elementSelector.cssSelector,
                  innerHtml: data.noCodeConfig.elementSelector.innerHtml,
                },
              }),
          },
        };
      } else if (type === "code") {
        updatedAction = {
          name: copyName.trim(),
          description: data.description,
          environmentId: toCopyEnvironment.id,
          type: "code",
          key: data.key,
        };
      }

      // const newActionClass: TActionClass =
      const createActionClassResposne = await createActionClassAction({
        action: updatedAction as TActionClassInput,
      });

      if (!createActionClassResposne?.data) {
        throw new Error(t("environments.actions.action_copy_failed", {}));
      }

      toast.success(t("environments.actions.action_copied_successfully"));
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorComponent />;

  return (
    <div className="grid grid-cols-3 pb-2">
      <div className="col-span-2 space-y-4 pr-6">
        <div>
          <Label className="text-slate-500">{t("common.active_surveys")}</Label>
          {activeSurveys?.length === 0 && <p className="text-sm text-slate-900">-</p>}
          {activeSurveys?.map((surveyName) => (
            <p key={surveyName} className="text-sm text-slate-900">
              {surveyName}
            </p>
          ))}
        </div>
        <div>
          <Label className="text-slate-500">{t("common.inactive_surveys")}</Label>
          {inactiveSurveys?.length === 0 && <p className="text-sm text-slate-900">-</p>}
          {inactiveSurveys?.map((surveyName) => (
            <p key={surveyName} className="text-sm text-slate-900">
              {surveyName}
            </p>
          ))}
        </div>
      </div>
      <div className="col-span-1 space-y-3 rounded-lg border border-slate-100 bg-slate-50 p-2">
        <div>
          <Label className="text-xs font-normal text-slate-500">Created on</Label>
          <p className="text-xs text-slate-700">
            {convertDateTimeStringShort(actionClass.createdAt?.toString())}
          </p>
        </div>{" "}
        <div>
          <Label className="text-xs font-normal text-slate-500">Last updated</Label>
          <p className="text-xs text-slate-700">
            {convertDateTimeStringShort(actionClass.updatedAt?.toString())}
          </p>
        </div>
        <div>
          <Label className="block text-xs font-normal text-slate-500">Type</Label>
          <div className="mt-1 flex items-center">
            <div className="mr-1.5 h-4 w-4 text-slate-600">
              {actionClass.type === "code" ? (
                <Code2Icon className="h-5 w-5" />
              ) : actionClass.type === "noCode" ? (
                <MousePointerClickIcon className="h-5 w-5" />
              ) : actionClass.type === "automatic" ? (
                <SparklesIcon className="h-5 w-5" />
              ) : null}
            </div>
            <p className="text-sm text-slate-700">{capitalizeFirstLetter(actionClass.type)}</p>
          </div>
        </div>
        <div className="">
          <Label className="text-xs font-normal text-slate-500">Environment</Label>
          <div className="items-center-center flex gap-2">
            <p className="text-xs text-slate-700">
              {environment.type === "development" ? "Development" : "Production"}
            </p>
            <Button
              onClick={() => {
                copyAction(actionClass);
              }}
              className="m-0 p-0 text-xs font-medium text-black underline underline-offset-4 focus:ring-0 focus:ring-offset-0"
              variant="minimal">
              {environment.type === "development" ? "Copy to Production" : "Copy to Development"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
