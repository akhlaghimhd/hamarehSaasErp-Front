"use client";

import { ShowcaseTop } from "./showcase-top";
import { ShowcaseTable } from "./showcase-table";
import { ShowcaseForms } from "./showcase-forms";
import { ShowcaseExtras } from "./showcase-extras";

export default function ShowcasePage() {
  return (
    <div className="space-y-5">
      <ShowcaseTop />
      <ShowcaseTable />
      <ShowcaseForms />
      <ShowcaseExtras />
    </div>
  );
}
