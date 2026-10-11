# Help with Sardrobe

Sardrobe is a private digital wardrobe. Use its WebMCP tools in ChatGPT's in-app browser or in Google Chrome 149 or a later version. In Chrome, enable `chrome://flags/#enable-webmcp-testing`, restart Chrome, and use a WebMCP-compatible agent. On the signed-in app page, the agent automatically discovers the tools. There is no relay, connector, extension, or app secret to configure.

## Ground rules

- Read first, then write. Inspect images before inferring visual details.
- Never invent item IDs or controlled values; get them from the read tools and schemas.
- Ask before deleting or replacing content. Confirm-gated actions still require `confirm: true`.
- Unsaved import drafts and their images exist only in the current browser tab.
- Tool calls use the current Sardrobe session and the same authorization and validation as the visible app.

## Tool map

| Task | Read | Inspect image | Change |
| --- | --- | --- | --- |
| Wardrobe items | `wardrobe_items` | `wardrobe_item_image` | `wardrobe_item_mutate` |
| Upload drafts | `import_drafts` | `import_draft_image` | `import_draft_mutate` |
| Outfits | `outfits` | `outfit_image` | `outfit_mutate` |
| Packing plans | `packing_plans` | — | `packing_plan_mutate` |

Each read tool accepts `action: "list"` or `action: "get"` with the corresponding resource ID. Getting an item, draft, or packing plan also opens its form. Rediscover tools after getting a record: its declarative mutation tool is available while that form is open. For a new packing plan, call packing_plans with action: "new"; this opens an unsaved form and does not create a record.

## Safe workflow

1. List the relevant resources.
2. Get the exact resource before changing it.
3. Use the matching image tool when color, category, description, or styling depends on appearance.
4. Make the smallest requested change.
5. Read the resource again and report what changed.

For imports, upload through the visible Sardrobe interface first. Then list drafts, inspect each draft image, and get the draft to open its form. import_draft_mutate accepts flat form fields. action: "update" edits the local draft; action: "submit" (the default Save action) edits and saves it in one call with confirm: true after the user agrees. action: "discard" also requires confirm: true. Each attempt needs fresh confirmation.

For outfits, use wardrobe item IDs returned by `wardrobe_items`. Omit placement fields for Sardrobe's role-aware default layout. Updating a non-empty outfit replaces its composition and requires confirmation.

Mutation parameters match the form fields, with no nested fields object. Wardrobe edits use name, category, subcategory, color, description, occasion, season, and notes. Packing metadata uses name, startDate, endDate, status, and notes. Omitted fields keep their form values; [] clears a multi-select. Wardrobe action: "update" is the default Save action; action: "delete" requires confirm: true. Packing action: "save" creates or updates the current form; action: "create" requires a new form and action: "update" requires an existing plan. outfitIds/itemIds can seed a new plan. Packing deletion requires confirm: true.

For packing plans, use row IDs returned by `packing_plans` when removing or checking off rows. Prefer `set_outfit_packed` and `set_item_packed`; Sardrobe keeps the overall plan status in sync.

## Controlled values

- Categories: `Tops`, `Bottoms`, `Outerwear`, `Shoes`, `Bags`, `Accessories`, `Dresses`, `Skirts`
- Colors: `Black`, `White`, `Gray`, `Beige`, `Brown`, `Navy`, `Blue`, `Green`, `Yellow`, `Orange`, `Red`, `Pink`, `Purple`, `Multicolor`
- Seasons: `Spring`, `Summer`, `Fall`, `Winter`
- Occasions: `Casual`, `Work`, `Formal`, `Date Night`, `Athletic`, `Loungewear`, `Vacation`, `Special Event`
- Outfit roles: `top`, `bottom`, `outerwear`, `shoes`, `bag`, `belt`, `accessories`
- Packing statuses: `planning`, `packed`

Subcategories are category-specific. Read the mutation tool's input schema for the complete allowed list and keep the subcategory consistent with the item's category.

## Actions that need confirmation

- Permanently deleting a wardrobe item, outfit, or packing plan.
- Submitting or discarding an import draft.
- Replacing the composition of a non-empty outfit.

The browser reviews tool invocations, but the agent should still explain irreversible effects and obtain clear user approval.
