
// You can also split your modules across files
// Verilog files can be placed in any directory, and split among multiple directories
// Each verilog file can contain multiple module definitions
// Note that it is YOUR job to tell Quartus where your Verilog files are located
// Do this through "Project" -> "Add/Remove Files in Project"

module my_and(a, b, out);

	input a, b;
	output out;
	
	// && is the binary AND operator
	assign out = a && b;
	
endmodule

module my_xor(a, b, out);

	input a, b;
	output out;
	
	// ^ is the binary XOR operator
	assign out = a ^ b;
	
endmodule
