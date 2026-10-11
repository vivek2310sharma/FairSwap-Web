import React,{useState} from "react";
import {afterEach,expect,it,vi} from "vitest";
import {cleanup,fireEvent,render,screen} from "@testing-library/react";
import CarAnswerField from "@/components/listings/CarAnswerField";
import {carsV1,validateCarAnswers} from "@/lib/listings/cars/contract";
afterEach(()=>{cleanup();vi.restoreAllMocks();});
const now=new Date("2026-10-10T00:00:00Z");
const placeholders={fuel_type:"Select fuel",transmission:"Select transmission",powertrain:"Select powertrain"};
it.each(["fuel_type","transmission","powertrain","range_km","battery_capacity_kwh"])("Known %s emits no factual default and cannot validate until completed",field=>{
  const change=vi.fn(),answers=field==="range_km"||field==="battery_capacity_kwh"?{powertrain:{state:"known",value:"hybrid"}}:{};
  const {rerender}=render(<CarAnswerField field={field} answers={answers} change={change}/>);
  fireEvent.change(screen.getByLabelText(`${field} answer`),{target:{value:"known"}});
  const emitted=change.mock.lastCall![1];
  expect(emitted).toEqual(field==="range_km"?{state:"known",basis:"electric_only"}:{state:"known"});
  rerender(<CarAnswerField field={field} answers={{...answers,[field]:emitted}} change={change}/>);
  const input=screen.getByLabelText(`${field} value`);
  if(field in placeholders){expect(input).toHaveValue("");expect((screen.getByRole("option",{name:placeholders[field as keyof typeof placeholders]}) as HTMLOptionElement).selected).toBe(true);}
  else expect(input).toHaveValue(null);
  const validated=validateCarAnswers({...answers,[field]:emitted},["fuel_type","transmission"].includes(field)?carsV1.paths[0]:carsV1.paths[7],now);
  expect(validated.error).toMatch(/select|enter/i);
  expect(validated.data).toBeUndefined();
});
it.each([["fuel_type","diesel"],["transmission","automatic"],["powertrain","hybrid"]])("explicit %s selection emits exactly the selected answer",(field,value)=>{
  const change=vi.fn();render(<CarAnswerField field={field} answers={{[field]:{state:"known"}}} change={change}/>);
  fireEvent.change(screen.getByLabelText(`${field} value`),{target:{value}});
  expect(change).toHaveBeenLastCalledWith(field,{state:"known",value});
  expect(validateCarAnswers({[field]:change.mock.lastCall![1]},field==="powertrain"?carsV1.paths[7]:carsV1.paths[0],now).error).toBeUndefined();
});
it.each(["fuel_type","transmission","powertrain"])("returning %s to its placeholder remains an invalid Known edit",field=>{
  const change=vi.fn();render(<CarAnswerField field={field} answers={{[field]:{state:"known",value:"other",other:"Seller detail"}}} change={change}/>);
  fireEvent.change(screen.getByLabelText(`${field} value`),{target:{value:""}});
  expect(change).toHaveBeenLastCalledWith(field,{state:"known"});
  expect(validateCarAnswers({[field]:change.mock.lastCall![1]},field==="powertrain"?carsV1.paths[7]:carsV1.paths[0],now).error).toMatch(/select/i);
});
it("range stays blank until explicit zero, which survives validation and refresh",()=>{
  const change=vi.fn(),powertrain={state:"known",value:"battery_electric"};
  const {rerender}=render(<CarAnswerField field="range_km" answers={{powertrain,range_km:{state:"known",basis:"electric_only"}}} change={change}/>);
  expect(screen.getByLabelText("range_km value")).toHaveValue(null);
  fireEvent.change(screen.getByLabelText("range_km value"),{target:{value:"0"}});
  expect(change).toHaveBeenLastCalledWith("range_km",{state:"known",value:0,basis:"electric_only"});
  const saved={powertrain,range_km:change.mock.lastCall![1]};
  expect(validateCarAnswers(saved,carsV1.paths[7],now).data).toEqual(saved);
  rerender(<CarAnswerField field="range_km" answers={structuredClone(saved)} change={change}/>);
  expect(screen.getByLabelText("range_km value")).toHaveValue(0);
  fireEvent.change(screen.getByLabelText("range_km value"),{target:{value:""}});
  expect(change).toHaveBeenLastCalledWith("range_km",{state:"known",basis:"electric_only"});
  expect(validateCarAnswers({powertrain,range_km:change.mock.lastCall![1]},carsV1.paths[7],now).error).toMatch(/enter/i);
});
it.each([undefined,{state:"known"},{state:"known",value:""},{state:"known",value:"invented"},{state:"known",value:"other"},{state:"known",value:"other",other:"   "},{state:"known",value:"other",other:"x".repeat(81)}])("incomplete powertrain %j disables known input without deleting existing numbers",powertrain=>{
  const change=vi.fn(),answers={powertrain,battery_capacity_kwh:{state:"known",value:58.3},range_km:{state:"known",value:0,basis:"electric_only"}};
  render(<><CarAnswerField field="battery_capacity_kwh" answers={answers} change={change}/><CarAnswerField field="range_km" answers={answers} change={change}/></>);
  for(const field of ["battery_capacity_kwh","range_km"]){
    expect(screen.getByLabelText(`${field} answer`).querySelector('option[value="known"]')).toBeDisabled();
    expect(screen.getByLabelText(`${field} value`)).toBeDisabled();
  }
  expect(screen.getByLabelText("battery_capacity_kwh value")).toHaveValue(58.3);
  expect(screen.getByLabelText("range_km value")).toHaveValue(0);
  expect(change).not.toHaveBeenCalled();
  expect(validateCarAnswers(answers,carsV1.paths[7],now).error).toBeTruthy();
});
it.each(["battery_electric","plug_in_hybrid","hybrid","other"])("complete %s powertrain enables dependent input and restores retained numbers",value=>{
  const change=vi.fn(),answers={powertrain:{state:"known",value,...(value==="other"?{other:"Seller detail"}:{})},battery_capacity_kwh:{state:"known",value:58.3},range_km:{state:"known",value:0,basis:"electric_only"}};
  const {rerender}=render(<CarAnswerField field="range_km" answers={{...answers,powertrain:{state:"known"}}} change={change}/>);
  rerender(<CarAnswerField field="range_km" answers={answers} change={change}/>);
  expect(screen.getByLabelText("range_km value")).toBeEnabled();expect(screen.getByLabelText("range_km value")).toHaveValue(0);
  rerender(<CarAnswerField field="battery_capacity_kwh" answers={answers} change={change}/>);
  expect(screen.getByLabelText("battery_capacity_kwh value")).toBeEnabled();expect(screen.getByLabelText("battery_capacity_kwh value")).toHaveValue(58.3);
  expect(screen.getByLabelText("battery_capacity_kwh answer").querySelector('option[value="known"]')).toBeEnabled();
  expect(change).not.toHaveBeenCalled();expect(validateCarAnswers(answers,carsV1.paths[7],now).error).toBeUndefined();
});
it.each([["fuel_type","petrol"],["transmission","manual"],["powertrain","battery_electric"]])("persisted %s answer survives cloned reference refresh",(field,value)=>{
  const change=vi.fn(),answers={[field]:{state:"known",value}};
  const {rerender}=render(<CarAnswerField field={field} answers={answers} change={change}/>);
  rerender(<CarAnswerField field={field} answers={structuredClone(answers)} change={change}/>);
  expect(screen.getByLabelText(`${field} value`)).toHaveValue(value);expect(change).not.toHaveBeenCalled();
});
function Form(){const [a,setA]=useState<Record<string,unknown>>({powertrain:{state:"known",value:"battery_electric"},battery_capacity_kwh:{state:"known",value:58.3},range_km:{state:"known",value:0,basis:"electric_only"},variant:"Retained variant"});const change=(k:string,v:unknown)=>setA(old=>({...old,[k]:v}));return <><CarAnswerField field="powertrain" answers={a} change={change}/><CarAnswerField field="battery_capacity_kwh" answers={a} change={change}/><CarAnswerField field="range_km" answers={a} change={change}/><output data-testid="answers">{JSON.stringify(a)}</output></>;}
it("editing Other powertrain detail disables and re-enables retained numbers without clearing unrelated answers",()=>{
  const confirm=vi.spyOn(window,"confirm");render(<Form/>);
  fireEvent.change(screen.getByLabelText("powertrain value"),{target:{value:"other"}});
  expect(screen.getByLabelText("range_km value")).toBeDisabled();
  expect(screen.getByLabelText("battery_capacity_kwh value")).toBeDisabled();
  expect(screen.getByRole("alert")).toHaveTextContent("Enter 1–80 characters for Other powertrain");
  fireEvent.change(screen.getByLabelText("powertrain Other detail"),{target:{value:"Seller detail"}});
  expect(screen.getByLabelText("range_km value")).toBeEnabled();
  expect(screen.getByLabelText("battery_capacity_kwh value")).toBeEnabled();
  fireEvent.change(screen.getByLabelText("powertrain Other detail"),{target:{value:""}});
  expect(screen.getByLabelText("range_km value")).toBeDisabled();
  expect(JSON.parse(screen.getByTestId("answers").textContent!)).toEqual({powertrain:{state:"known",value:"other",other:""},battery_capacity_kwh:{state:"known",value:58.3},range_km:{state:"known",value:0,basis:"electric_only"},variant:"Retained variant"});
  expect(confirm).not.toHaveBeenCalled();
});
it("confirms clearing known dependent answers while preserving unrelated seller details",()=>{
  const confirm=vi.spyOn(window,"confirm").mockReturnValue(false);render(<Form/>);
  fireEvent.change(screen.getByLabelText("powertrain answer"),{target:{value:"unknown"}});
  expect(confirm).toHaveBeenCalledOnce();expect(screen.getByLabelText("range_km value")).toHaveValue(0);
  confirm.mockReturnValue(true);fireEvent.change(screen.getByLabelText("powertrain answer"),{target:{value:"unknown"}});
  expect(JSON.parse(screen.getByTestId("answers").textContent!)).toEqual({powertrain:{state:"unknown"},battery_capacity_kwh:{state:"unanswered"},range_km:{state:"unanswered"},variant:"Retained variant"});
  expect(screen.queryByLabelText("range_km value")).not.toBeInTheDocument();
  expect(screen.getByLabelText("range_km answer").querySelector('option[value="known"]')).toBeDisabled();
});
it("uses bounded Other details and removes stale Other text on option change",()=>{
  const change=vi.fn();const {rerender}=render(<CarAnswerField field="fuel_type" answers={{fuel_type:{state:"known",value:"petrol"}}} change={change}/>);
  fireEvent.change(screen.getByLabelText("fuel_type value"),{target:{value:"other"}});expect(change).toHaveBeenLastCalledWith("fuel_type",{state:"known",value:"other",other:""});
  rerender(<CarAnswerField field="fuel_type" answers={{fuel_type:{state:"known",value:"other",other:"Detail"}}} change={change}/>);
  expect(screen.getByLabelText("fuel_type Other detail")).toHaveAttribute("maxlength","80");
  fireEvent.change(screen.getByLabelText("fuel_type value"),{target:{value:"petrol"}});expect(change).toHaveBeenLastCalledWith("fuel_type",{state:"known",value:"petrol"});
});
