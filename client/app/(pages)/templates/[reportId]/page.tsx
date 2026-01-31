"use client";

import { useParams } from "next/navigation";
import { TemplateKit } from "../../home/TemplateKitForm";


export default function EditTemplatePage() {
  const { reportId } = useParams<{ reportId: string }>();
  console.log("Editing template with reportId:", reportId);

  return <TemplateKit reportId={reportId} />;
}
