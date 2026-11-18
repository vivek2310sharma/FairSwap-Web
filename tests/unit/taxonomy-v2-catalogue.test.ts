import {expect,it,vi} from "vitest";
import {parseTaxonomy,taxonomySchema} from "@/lib/listings/taxonomy-v2";
import {resolveSub,searchCatalogue} from "@/lib/listings/post-ad-category-catalogue";
import fixture from "./taxonomy-v2-fixture.json";
vi.mock("server-only",()=>({}));
import {loadTaxonomy} from "@/lib/listings/taxonomy-v2-server";
const bindings=Object.fromEntries(fixture.nodes.filter(n=>n.posting_enabled).map(n=>[n.posting_flow,n.id]));
it("adapts exact 15/63 counts and preserves runtime identities and order",()=>{const tree=parseTaxonomy(fixture,bindings);expect(tree).toHaveLength(15);expect(tree.flatMap(g=>g.subs)).toHaveLength(63);expect(tree.map(g=>g.label.en)).toEqual(fixture.nodes.filter(n=>!n.parent_id).map(n=>n.name));expect(searchCatalogue("Projectors",tree)[0].sub?.label).toBe("Projectors");});
it.each(["missing","uuid","duplicate","slug","parent","depth","revision","flow","root","availability"])("rejects malformed %s",kind=>{const f=structuredClone(fixture);if(kind==="missing")f.nodes.pop();if(kind==="uuid")f.nodes[1].id="bad";if(kind==="duplicate")f.nodes[2].id=f.nodes[1].id;if(kind==="slug")f.nodes[2].slug=f.nodes[1].slug;if(kind==="parent")f.nodes[1].parent_id="00000000-0000-4000-8000-000000000000";if(kind==="depth")f.nodes[2].parent_id=f.nodes[1].id;if(kind==="revision")f.taxonomy_revision="unknown";if(kind==="flow")f.nodes[1].posting_flow="unsafe";if(kind==="root")f.nodes[0].posting_enabled=true;if(kind==="availability")f.nodes[1].status="coming_soon";expect(taxonomySchema.safeParse(f).success).toBe(false);});
it("requires backend flag, matched runtime ID and client capability",()=>{const f=structuredClone(fixture);f.nodes[1].posting_enabled=false;expect(parseTaxonomy(f,bindings)[0].subs[0].route.kind).toBe("none");expect(parseTaxonomy(fixture,{})[0].subs[0].route.kind).toBe("none");const sub=parseTaxonomy(fixture,bindings)[0].subs[0];expect(resolveSub(sub,{mobilePhones:false,cars:"off",twoWheelers:"off",property:"off",goodsCategories:[],propertyPaths:[]})).toEqual({readiness:"coming-soon"});});
it("fails closed on RPC errors, malformed data and exceptions",async()=>{for(const rpc of [vi.fn().mockResolvedValue({data:fixture,error:{message:"denied"}}),vi.fn().mockResolvedValue({data:{},error:null}),vi.fn().mockRejectedValue(new Error("offline"))]){expect(await loadTaxonomy({rpc} as unknown as Parameters<typeof loadTaxonomy>[0],bindings)).toBeNull();expect(rpc).toHaveBeenCalledWith("get_category_catalogue_v2");}});

it.each(["mobile-phones","tablets","wearables"])("preserves the verified %s specialist route",slug=>{
 const sub=parseTaxonomy(fixture,bindings).flatMap(group=>group.subs).find(node=>node.id===slug)!;
 expect(sub.route.kind).toBe(slug);
 expect(resolveSub(sub,{mobilePhones:true,tablets:true,wearables:true,cars:"off",twoWheelers:"off",property:"off",goodsCategories:[],propertyPaths:[]}).readiness).toBe("available");
});
it("never bridges enabled canonical legacy families to old writable forms",()=>{
 const value=structuredClone(fixture);
 for(const node of value.nodes)if(node.parent_id){node.status="live";node.posting_enabled=true;}
 const tree=parseTaxonomy(value,bindings);
 expect(tree.flatMap(group=>group.subs).filter(node=>node.route.kind!=="none").map(node=>node.id)).toEqual(["mobile-phones","tablets","wearables"]);
 for(const name of ["TVs","Projectors","Speakers & Home Theatre","Cameras & Lenses"]){
  expect(tree.find(group=>group.id==="v2-tvs-audio-cameras")?.subs.some(node=>node.label===name)).toBe(true);
 }
 for(const slug of ["v2-services","v2-jobs"])expect(tree.find(group=>group.id===slug)?.subs).toEqual([]);
});
